import { renderToStaticMarkup } from 'react-dom/server'
import { parse as parseYaml } from 'yaml'
import { createResolver, type IconPack, type IconResolver } from './icons.js'
import { layout } from './layout.js'
import { normalize } from './normalize.js'
import { Diagram, defaultTheme, type Theme } from './render.js'

export type { ElkNode } from 'elkjs'
export type { IconAsset, IconPack, IconResolver } from './icons.js'
export { createResolver } from './icons.js'
export { layout } from './layout.js'
export type { FlatNode, Ir } from './normalize.js'
export { DiagramError, normalize } from './normalize.js'
export type { DiagramProps, Theme } from './render.js'
export { Diagram, defaultTheme } from './render.js'
export type { Diagram as DiagramInput, Edge, FlatDiagram, NodeEntry } from './schema.js'
export {
  DiagramSchema,
  EdgeSchema,
  FlatDiagramSchema,
  FlatNodeSchema,
  NodeEntrySchema,
} from './schema.js'

export interface RenderOptions {
  /** Icon packs, or a resolver you built yourself. Required for any diagram with `type:` nodes. */
  icons?: IconResolver | IconPack | IconPack[]
  theme?: Theme
}

/** Parses YAML or JSON source into the untyped document `normalize` accepts. */
export function parse(source: string): unknown {
  return parseYaml(source)
}

function toResolver(icons: RenderOptions['icons']): IconResolver {
  if (!icons) return createResolver()
  if ('resolve' in icons) return icons
  return Array.isArray(icons) ? createResolver(...icons) : createResolver(icons)
}

/** source -> validated IR -> ELK layout -> SVG string. Touches no DOM. */
export async function renderToSvg(
  source: string | unknown,
  options: RenderOptions = {},
): Promise<string> {
  const ir = normalize(typeof source === 'string' ? parse(source) : source)
  const root = await layout(ir)
  const element = Diagram({
    root,
    ir,
    icons: toResolver(options.icons),
    theme: options.theme ?? defaultTheme,
  })
  return renderToStaticMarkup(element)
}
