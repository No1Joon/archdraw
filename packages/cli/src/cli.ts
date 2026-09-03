#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createResolver,
  type Detour,
  DiagramError,
  darkTheme,
  defaultTheme,
  detours,
  type IconPack,
  type Ir,
  normalize,
  parse,
  renderToSvg,
  type Theme,
  toJsonSchema,
} from '@archdraw/core'
import { awsIcons } from '@archdraw/icons-aws'
import { brandIcons } from '@archdraw/icons-brands'
import { gcpIcons } from '@archdraw/icons-gcp'
import { Resvg } from '@resvg/resvg-js'
import { Command } from 'commander'

const packs: Record<string, IconPack> = { aws: awsIcons, gcp: gcpIcons, brands: brandIcons }

const themes: Record<string, Theme> = { light: defaultTheme, dark: darkTheme }

// Bundled so a PNG carries the same glyphs everywhere; system fonts differ per machine and
// resvg draws nothing at all for a family it cannot resolve.
const FONT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts', 'NotoSansKR.ttf')

/** Long lists cost an agent context; make it narrow the query instead. */
const LIST_LIMIT = 60

/** Several queries at once answer a whole diagram, so each one gets a shortlist. */
const BATCH_LIMIT = 10

/** The rank at which a match is only a word ending — enough to answer, not to volunteer. */
const WORD_END = 4

const program = new Command()
  .name('archdraw')
  .description('Render cloud architecture diagrams from YAML.')
  .version(createRequire(import.meta.url)('../package.json').version)

const DETOUR_LIST = 5
const DRIFT_LIST = 3

/** Enough to show that another pack answers too, short enough to stay a footnote. */
const OTHER_PACK_LIST = 3

/** Why one edge came out long. Naming the wrong cause costs more than naming none. */
function detourCause(detour: Detour, ir: Ir): 'backward' | 'boundary' | 'wrap' | 'layout' {
  if (detour.backward) return 'backward'
  const parent = (id: string) => ir.nodes.find((node) => node.id === id)?.parent ?? null
  if (parent(detour.from) !== parent(detour.to)) return 'boundary'
  // Rows are what a wrapped chain is folded into, so an edge between rows pays for the fold.
  return ir.wrap ? 'wrap' : 'layout'
}

/** Never fatal and never on stdout — stdout may be the SVG. */
function reportDetours(found: Detour[], ir: Ir) {
  if (found.length === 0) return
  const noted = found.map((detour) => ({ detour, cause: detourCause(detour, ir) }))
  const why: Record<ReturnType<typeof detourCause>, string> = {
    backward: `against direction: ${ir.direction}`,
    boundary: 'crosses a group boundary',
    wrap: 'spans two rows of the wrap',
    layout: 'routed around what sits between them',
  }
  const one = found.length === 1
  console.error(
    `${found.length} ${one ? 'edge routes' : 'edges route'} far around what ${one ? 'it crosses' : 'they cross'}:`,
  )
  for (const { detour, cause } of noted.slice(0, DETOUR_LIST)) {
    console.error(
      `  ${detour.from} -> ${detour.to} (${detour.ratio.toFixed(1)}x the direct line, ${why[cause]})`,
    )
  }
  if (found.length > DETOUR_LIST) console.error(`  ... ${found.length - DETOUR_LIST} more`)
  const advice: Record<ReturnType<typeof detourCause>, string> = {
    backward: 'An edge against the direction is only shortened by `direction` or the edge itself.',
    boundary: 'An edge across a boundary is shortened by putting the pair in one group.',
    wrap: '`wrap: true` folds the chain into rows; an edge between rows is shortened by ordering the pair together, or by dropping `wrap`.',
    layout: 'Ordering the pair next to each other in `nodes` is what shortens one of these.',
  }
  for (const cause of ['backward', 'boundary', 'wrap', 'layout'] as const) {
    if (noted.some((note) => note.cause === cause)) console.error(`  ${advice[cause]}`)
  }
}

/** A label written with one backslash too many draws the escape instead of the break, and the
 *  wider node it makes is exactly what an author asking for a narrow picture did not want. */
function reportLiteralBreaks(ir: Ir) {
  const labels = [
    ...ir.nodes.map((node) => ({ id: node.id, label: node.label })),
    ...ir.edges.map((edge) => ({ id: `${edge.from} -> ${edge.to}`, label: edge.label ?? '' })),
  ].filter((entry) => entry.label.includes('\\n'))
  if (labels.length === 0) return
  const one = labels.length === 1
  console.error(
    `${labels.length} ${one ? 'label draws' : 'labels draw'} a literal \\n instead of a line break: ` +
      `${labels
        .slice(0, DRIFT_LIST)
        .map((entry) => entry.id)
        .join(', ')}` +
      `${labels.length > DRIFT_LIST ? `, and ${labels.length - DRIFT_LIST} more` : ''}.`,
  )
  console.error('  One backslash breaks the line in a "quoted" label; a `|-` block does too.')
}

/** `-p` covers for a diagram whose own `provider` is short of what it draws, and the file that
 *  comes out of it renders here and nowhere else. Only the types that miss are worth a word. */
function reportProviderDrift(ir: Ir, flag: string | undefined) {
  if (!flag || flag === ir.provider) return
  let own: ReturnType<typeof iconsFor>
  try {
    own = iconsFor(ir.provider)
  } catch {
    return // Its `provider` names no pack at all; the flag is the only reason this ran.
  }
  const missing = new Set<string>()
  for (const node of ir.nodes) {
    if (!node.type) continue
    try {
      own.resolve(node.type)
    } catch {
      missing.add(node.type)
    }
  }
  if (missing.size === 0) return
  const shown = [...missing].slice(0, DRIFT_LIST).join(', ')
  const more = missing.size > DRIFT_LIST ? `, and ${missing.size - DRIFT_LIST} more` : ''
  console.error(
    `The diagram says \`provider: ${ir.provider}\`, which does not cover ${shown}${more}. ` +
      `It renders under -p ${flag} and nowhere else — write \`provider: ${flag}\` into the file.`,
  )
}

// A default command, not root options: a `-p` on the root shadows the same flag on `types`.
program
  .command('render', { isDefault: true })
  .description('Render a diagram file to SVG or PNG.')
  .argument('<input>', "diagram YAML or JSON file, or '-' to read stdin")
  .option('-o, --out <file>', 'output path; .png renders a raster, anything else writes SVG')
  .option(
    '-p, --provider <names>',
    "icon packs to load, comma separated; defaults to the diagram's own `provider`",
  )
  .option('-s, --scale <n>', 'PNG scale factor', '2')
  .option('--theme <name>', `palette to draw with (${Object.keys(themes).join(', ')})`, 'light')
  .option('--check', 'validate the diagram and write nothing')
  .action(async (input: string, options) => {
    await run(async () => {
      const source = input === '-' ? readFileSync(0, 'utf8') : readFileSync(input, 'utf8')
      const document = parse(source)
      const ir = normalize(document)
      // The flag wins when given; otherwise the diagram says which packs it needs.
      const icons = iconsFor(options.provider ?? ir.provider)
      reportProviderDrift(ir, options.provider)
      reportLiteralBreaks(ir)
      if (options.check) {
        ir.nodes.forEach((node) => {
          if (node.type) icons.resolve(node.type)
        })
        console.error('ok')
        return
      }
      const svg = await renderToSvg(document, {
        icons,
        theme: themeFor(options.theme),
        onLayout: (laid, root) => reportDetours(detours(laid, root), laid),
      })
      write(svg, options.out, scaleFor(options.scale))
    })
  })

/** Rank by how the query lands; a match with the query buried mid-word is a coincidence. */
function rank(
  hits: { line: string; key: string; alias: boolean }[],
  needle: string,
  ceiling = 5,
): string[] {
  const score = (key: string) => {
    const segments = key.split('-')
    if (key === needle) return 0
    if (key.startsWith(`${needle}-`)) return 1
    if (key.endsWith(`-${needle}`) || key.includes(`-${needle}-`)) return 2
    // A word start still answers the query: 'postgres' must reach amazon-aurora-postgresql-instance.
    if (segments.some((segment) => segment.startsWith(needle))) return 3
    // brands runs its words together, so 'airflow' only ever ends apacheairflow.
    if (segments.some((segment) => segment.endsWith(needle))) return 4
    return 5
  }
  const scored = hits.map((hit) => ({ ...hit, score: score(hit.key) }))
  const landed = scored.filter((hit) => hit.score < ceiling)
  // A weak landing is worth showing to someone who asked for the word — 'rds' does end
  // 'awwwards' — but never worth volunteering under a query that was about something else.
  const kept = landed.length > 0 || ceiling < 5 ? landed : scored
  return kept
    .sort(
      (a, b) =>
        a.score - b.score || Number(b.alias) - Number(a.alias) || a.line.localeCompare(b.line),
    )
    .map((hit) => hit.line)
}

/** Every slug and alias the query lands on, ranked. */
function search(selected: IconPack[], needle: string, ceiling?: number): string[] {
  const slugs = selected.flatMap((pack) => Object.keys(pack.icons)).sort()
  const aliases = selected
    .flatMap((pack) => Object.entries(pack.aliases))
    .sort(([a], [b]) => a.localeCompare(b))
  return rank(
    [
      ...aliases
        .filter(([alias, slug]) => alias.includes(needle) || slug.includes(needle))
        .map(([alias, slug]) => ({ line: `${alias} -> ${slug}`, key: alias, alias: true })),
      ...slugs
        .filter((slug) => slug.includes(needle))
        .map((slug) => ({ line: slug, key: slug, alias: false })),
    ],
    needle,
    ceiling,
  )
}

/** A pack that answers hides what the others hold: `types flink` on aws alone reads as if
 *  the managed service were the only Flink there is, and `apacheflink` is never offered. */
function elsewhere(provider: string, needle: string): string[] {
  const loaded = provider.split(',').map((name) => name.trim())
  return Object.entries(packs)
    .filter(([name]) => !loaded.includes(name))
    .flatMap(([name, pack]) => {
      // The footnote names what to draw, so an alias and its slug are one answer, not two.
      const hits = [
        ...new Set(search([pack], needle, WORD_END).map((hit) => hit.split(' -> ').pop())),
      ]
      if (hits.length === 0) return []
      const shown = hits.slice(0, OTHER_PACK_LIST).join(', ')
      const more =
        hits.length > OTHER_PACK_LIST ? `, and ${hits.length - OTHER_PACK_LIST} more` : ''
      return [`Also in '${name}': ${shown}${more}. Load it with -p ${[...loaded, name].join(',')}`]
    })
}

program
  .command('types')
  .description('Search the icon type slugs and aliases a diagram may use.')
  .argument('[query...]', 'substrings to match against slugs and aliases')
  .option('-p, --provider <names>', 'icon packs to load, comma separated', 'aws')
  .action((queries: string[], options) => {
    run(async () => {
      const selected = packsFor(options.provider)

      if (queries.length === 0) {
        const slugs = selected.flatMap((pack) => Object.keys(pack.icons))
        const aliases = selected.flatMap((pack) => Object.keys(pack.aliases))
        console.error(
          `${slugs.length} types and ${aliases.length} aliases in '${options.provider}'. ` +
            `Narrow with: archdraw types <query> -p ${options.provider}`,
        )
        return
      }

      // One query keeps the output it always had; a header would break whatever reads it.
      const label = (query: string) => (queries.length > 1 ? `# ${query}` : undefined)
      // A batch is asked in order to spend less, so no one query may fill the answer.
      const limit = queries.length > 1 ? BATCH_LIMIT : LIST_LIMIT
      const missed: string[] = []

      for (const query of queries) {
        const needle = query.toLowerCase()
        const hits = search(selected, needle)
        const others = elsewhere(options.provider, needle)
        const heading = label(query)

        if (hits.length === 0) {
          missed.push(query)
          console.error(
            `${heading ? `${heading}: ` : ''}No type matches '${query}' in '${options.provider}'. ` +
              (others.length > 0
                ? others.join(' ')
                : `Try a shorter word, or another pack: ${Object.keys(packs).join(', ')}.`),
          )
          continue
        }

        if (heading) console.log(heading)
        for (const hit of hits.slice(0, limit)) console.log(hit)
        if (hits.length > limit) {
          console.error(
            `... ${hits.length - limit} more for '${query}'. ` +
              (heading ? 'Ask for it on its own, or narrow it.' : 'Narrow the query.'),
          )
        }
        for (const other of others) console.error(other)
      }

      // A miss is a type the diagram cannot use, so it fails the run even beside a dozen hits.
      if (missed.length > 0) {
        throw new Error(
          missed.length === queries.length
            ? `Nothing matched: ${missed.join(', ')}.`
            : `Named above, with no match: ${missed.join(', ')}.`,
        )
      }
    })
  })

program
  .command('schema')
  .description('Print the diagram input contract as JSON Schema.')
  .option('--flat', 'the flat form only, without the nested `children` shape')
  .action((options) => {
    run(async () => {
      console.log(JSON.stringify(toJsonSchema(options.flat ? 'flat' : 'input'), null, 2))
    })
  })

/** `-p aws,brands` — one diagram often spans a cloud and the software running on it. */
function packsFor(provider: string): IconPack[] {
  return provider.split(',').map((name) => {
    const pack = packs[name.trim()]
    if (!pack) {
      throw new Error(`Unknown provider '${name.trim()}'. Known: ${Object.keys(packs).join(', ')}`)
    }
    if (Object.keys(pack.icons).length === 0) {
      throw new Error(
        `The ${name.trim()} icon pack is empty — run \`pnpm icons:sync ${name.trim()}\` in the repo.`,
      )
    }
    return pack
  })
}

function iconsFor(provider: string) {
  return createResolver(...packsFor(provider))
}

function themeFor(name: string): Theme {
  const theme = themes[name]
  if (!theme) {
    throw new Error(`Unknown theme '${name}'. Known: ${Object.keys(themes).join(', ')}`)
  }
  return theme
}

/** resvg reports a zero target size from deep inside itself; say it here instead. */
const MAX_SCALE = 10

function scaleFor(input: string): number {
  const scale = Number(input)
  if (!Number.isFinite(scale) || scale <= 0 || scale > MAX_SCALE) {
    throw new Error(
      `Scale must be a number greater than 0 and at most ${MAX_SCALE}, got '${input}'.`,
    )
  }
  return scale
}

function write(svg: string, out: string | undefined, scale: number) {
  if (!out) {
    process.stdout.write(svg)
    return
  }
  if (extname(out).toLowerCase() === '.png') {
    const png = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: scale },
      font: { loadSystemFonts: false, fontFiles: [FONT], defaultFontFamily: 'Noto Sans KR' },
    })
      .render()
      .asPng()
    writeFileSync(out, png)
  } else {
    writeFileSync(out, svg)
  }
  console.error(`wrote ${out}`)
}

async function run(action: () => Promise<void>) {
  try {
    await action()
  } catch (error) {
    if (error instanceof DiagramError) {
      console.error(error.message)
    } else {
      console.error(error instanceof Error ? error.message : String(error))
    }
    process.exitCode = 1
  }
}

await program.parseAsync()
