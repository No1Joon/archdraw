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

const program = new Command()
  .name('archdraw')
  .description('Render cloud architecture diagrams from YAML.')
  .version(createRequire(import.meta.url)('../package.json').version)

const DETOUR_LIST = 5

/** Never fatal and never on stdout — stdout may be the SVG. */
function reportDetours(found: Detour[], direction: string) {
  if (found.length === 0) return
  const one = found.length === 1
  console.error(
    `${found.length} ${one ? 'edge routes' : 'edges route'} far around what ${one ? 'it crosses' : 'they cross'}:`,
  )
  for (const detour of found.slice(0, DETOUR_LIST)) {
    const why = detour.backward ? `against direction: ${direction}` : 'crosses a group boundary'
    console.error(
      `  ${detour.from} -> ${detour.to} (${detour.ratio.toFixed(1)}x the direct line, ${why})`,
    )
  }
  if (found.length > DETOUR_LIST) console.error(`  ... ${found.length - DETOUR_LIST} more`)
  if (found.some((detour) => detour.backward)) {
    console.error(
      '  An edge against the direction is only shortened by `direction` or the edge itself.',
    )
  }
  if (found.some((detour) => !detour.backward)) {
    console.error('  An edge across a boundary is shortened by putting the pair in one group.')
  }
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
        onLayout: (laid, root) => reportDetours(detours(laid, root), laid.direction),
      })
      write(svg, options.out, scaleFor(options.scale))
    })
  })

/** Rank by how the query lands; a match with the query buried mid-word is a coincidence. */
function rank(hits: { line: string; key: string; alias: boolean }[], needle: string): string[] {
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
  const kept = scored.some((hit) => hit.score < 5) ? scored.filter((hit) => hit.score < 5) : scored
  return kept
    .sort(
      (a, b) =>
        a.score - b.score || Number(b.alias) - Number(a.alias) || a.line.localeCompare(b.line),
    )
    .map((hit) => hit.line)
}

program
  .command('types')
  .description('Search the icon type slugs and aliases a diagram may use.')
  .argument('[query]', 'substring to match against slugs and aliases')
  .option('-p, --provider <names>', 'icon packs to load, comma separated', 'aws')
  .action((query: string | undefined, options) => {
    run(async () => {
      const selected = packsFor(options.provider)
      const slugs = selected.flatMap((pack) => Object.keys(pack.icons)).sort()
      const aliases = selected
        .flatMap((pack) => Object.entries(pack.aliases))
        .sort(([a], [b]) => a.localeCompare(b))

      if (!query) {
        console.error(
          `${slugs.length} types and ${aliases.length} aliases in '${options.provider}'. ` +
            `Narrow with: archdraw types <query> -p ${options.provider}`,
        )
        return
      }

      const needle = query.toLowerCase()
      const hits = rank(
        [
          ...aliases
            .filter(([alias, slug]) => alias.includes(needle) || slug.includes(needle))
            .map(([alias, slug]) => ({ line: `${alias} -> ${slug}`, key: alias, alias: true })),
          ...slugs
            .filter((slug) => slug.includes(needle))
            .map((slug) => ({ line: slug, key: slug, alias: false })),
        ],
        needle,
      )

      if (hits.length === 0) {
        throw new Error(
          `No type matches '${query}' in '${options.provider}'. ` +
            `Try a shorter word, or another pack: ${Object.keys(packs).join(', ')}.`,
        )
      }

      for (const hit of hits.slice(0, LIST_LIMIT)) console.log(hit)
      if (hits.length > LIST_LIMIT) {
        console.error(`... ${hits.length - LIST_LIMIT} more. Narrow the query.`)
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
