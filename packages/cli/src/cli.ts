#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { extname } from 'node:path'
import { fromPrompt } from '@archdraw/ai'
import { createResolver, DiagramError, type IconPack, renderToSvg } from '@archdraw/core'
import { awsIcons } from '@archdraw/icons-aws'
import { gcpIcons } from '@archdraw/icons-gcp'
import { Resvg } from '@resvg/resvg-js'
import { Command } from 'commander'
import { stringify } from 'yaml'

const packs: Record<string, IconPack> = { aws: awsIcons, gcp: gcpIcons }

const program = new Command()
  .name('archdraw')
  .description('Render cloud architecture diagrams from YAML or a prompt.')
  .version('0.0.0')

program
  .argument('<input>', 'diagram YAML or JSON file')
  .option('-o, --out <file>', 'output path; .png renders a raster, anything else writes SVG')
  .option('-p, --provider <name>', 'icon pack to load', 'aws')
  .option('-s, --scale <n>', 'PNG scale factor', '2')
  .action(async (input: string, options) => {
    await run(async () => {
      const svg = await renderToSvg(readFileSync(input, 'utf8'), {
        icons: iconsFor(options.provider),
      })
      write(svg, options.out, Number(options.scale))
    })
  })

program
  .command('prompt')
  .description('Describe a system in words and render the result.')
  .argument('<description>', 'what to draw')
  .option('-o, --out <file>', 'output path; .png renders a raster, anything else writes SVG')
  .option('-p, --provider <name>', 'icon pack to load', 'aws')
  .option('-m, --model <id>', 'Claude model id')
  .option('--save <file>', 'also write the generated diagram document as YAML')
  .action(async (description: string, options) => {
    await run(async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not set.')
      }
      const icons = iconsFor(options.provider)
      const result = await fromPrompt(description, {
        icons,
        provider: options.provider,
        model: options.model,
      })
      if (options.save) writeFileSync(options.save, stringify(result.document))
      const svg = await renderToSvg(result.document, { icons })
      write(svg, options.out, 2)
    })
  })

function iconsFor(provider: string) {
  const pack = packs[provider]
  if (!pack) {
    throw new Error(`Unknown provider '${provider}'. Known: ${Object.keys(packs).join(', ')}`)
  }
  if (Object.keys(pack.icons).length === 0) {
    throw new Error(
      `The ${provider} icon pack is empty — run \`pnpm icons:sync ${provider}\` in the repo, or install a published @archdraw/icons-${provider}.`,
    )
  }
  return createResolver(pack)
}

function write(svg: string, out: string | undefined, scale: number) {
  if (!out) {
    process.stdout.write(svg)
    return
  }
  if (extname(out).toLowerCase() === '.png') {
    // resvg rasterises text with system fonts; a machine missing the fallback family
    // renders blank labels rather than failing, so keep an eye on CI output.
    const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: scale } }).render().asPng()
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
