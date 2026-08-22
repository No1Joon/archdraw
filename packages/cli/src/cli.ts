#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createResolver,
  DiagramError,
  type IconPack,
  normalize,
  parse,
  renderToSvg,
  toJsonSchema,
} from '@archdraw/core'
import { awsIcons } from '@archdraw/icons-aws'
import { brandIcons } from '@archdraw/icons-brands'
import { gcpIcons } from '@archdraw/icons-gcp'
import { Resvg } from '@resvg/resvg-js'
import { Command } from 'commander'

const packs: Record<string, IconPack> = { aws: awsIcons, gcp: gcpIcons, brands: brandIcons }

// Bundled so a PNG carries the same glyphs everywhere; system fonts differ per machine and
// resvg draws nothing at all for a family it cannot resolve.
const FONT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts', 'NotoSansKR.ttf')

/** Long lists cost an agent context; make it narrow the query instead. */
const LIST_LIMIT = 60

const program = new Command()
  .name('archdraw')
  .description('Render cloud architecture diagrams from YAML.')
  .version(createRequire(import.meta.url)('../package.json').version)

// A default command, not root options: a `-p` on the root shadows the same flag on `types`.
program
  .command('render', { isDefault: true })
  .description('Render a diagram file to SVG or PNG.')
  .argument('<input>', "diagram YAML or JSON file, or '-' to read stdin")
  .option('-o, --out <file>', 'output path; .png renders a raster, anything else writes SVG')
  .option('-p, --provider <names>', 'icon packs to load, comma separated', 'aws')
  .option('-s, --scale <n>', 'PNG scale factor', '2')
  .option('--check', 'validate the diagram and write nothing')
  .action(async (input: string, options) => {
    await run(async () => {
      const source = input === '-' ? readFileSync(0, 'utf8') : readFileSync(input, 'utf8')
      const icons = iconsFor(options.provider)
      if (options.check) {
        normalize(parse(source)).nodes.forEach((node) => {
          if (node.type) icons.resolve(node.type)
        })
        console.error('ok')
        return
      }
      write(await renderToSvg(source, { icons }), options.out, Number(options.scale))
    })
  })

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
      const hits = [
        ...aliases
          .filter(([alias, slug]) => alias.includes(needle) || slug.includes(needle))
          .map(([alias, slug]) => `${alias} -> ${slug}`),
        ...slugs.filter((slug) => slug.includes(needle)),
      ]

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
