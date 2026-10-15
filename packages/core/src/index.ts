import type { ElkNode } from 'elkjs'
import { renderToStaticMarkup } from 'react-dom/server'
import { parse as parseYaml } from 'yaml'
import { page } from './html.js'
import { createResolver, type IconPack, type IconResolver } from './icons.js'
import { layout } from './layout.js'
import type { Ir } from './normalize.js'
import { normalize } from './normalize.js'
import { Diagram, defaultTheme, type Theme } from './render.js'
import { selectView, type ViewOptions } from './view.js'

export type { ElkNode } from 'elkjs'
export type { IconAsset, IconPack, IconResolver } from './icons.js'
export { createResolver } from './icons.js'
export type { Detour } from './layout.js'
export { DETOUR_RATIO, detours, layout } from './layout.js'
export type { FlatNode, Ir, IrEdge } from './normalize.js'
export { DiagramError, normalize } from './normalize.js'
export type { DiagramProps, Theme } from './render.js'
export { Diagram, darkTheme, defaultTheme } from './render.js'
export type { Diagram as DiagramInput, Edge, FlatDiagram, NodeEntry } from './schema.js'
export {
  DiagramSchema,
  EdgeSchema,
  FlatDiagramSchema,
  FlatNodeSchema,
  NodeEntrySchema,
  toJsonSchema,
} from './schema.js'
export type { ViewOptions } from './view.js'
export { selectView } from './view.js'

export interface RenderOptions extends ViewOptions {
  /** Icon packs, or a resolver you built yourself. Required for any diagram with `type:` nodes. */
  icons?: IconResolver | IconPack | IconPack[]
  theme?: Theme
  /** Sees the laid-out graph before it is drawn, so a caller can measure it without laying it out twice. */
  onLayout?: (ir: Ir, root: ElkNode) => void
  /** HTML only: the page follows `archdraw serve`, reloading on a redraw and keeping its view. */
  live?: boolean
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

/** The SVG plus a page around it: dashes travelling along every edge, and pan and zoom. */
export async function renderToHtml(
  source: string | unknown,
  options: RenderOptions = {},
): Promise<string> {
  const full = normalize(typeof source === 'string' ? parse(source) : source)
  selectView(full, options)
  const ir = full
  const root = await layout(ir)
  options.onLayout?.(ir, root)
  const theme = options.theme ?? defaultTheme
  const svg = renderToStaticMarkup(
    Diagram({ root, ir, icons: toResolver(options.icons), theme, flow: true }),
  )
  const variants: Record<string, string> = {}
  for (const scenario of full.scenarios) {
    const focused = selectView(full, { scenario: scenario.id, focus: true })
    variants[scenario.id] = renderToStaticMarkup(
      Diagram({
        root: await layout(focused),
        ir: focused,
        icons: toResolver(options.icons),
        theme,
        flow: true,
        scenario: scenario.id,
      }),
    )
  }
  return page(
    svg,
    ir.title ?? 'architecture diagram',
    theme,
    ir.nodes.some((n) => n.external),
    ir.scenarios,
    options.live,
    variants,
    options.scenario,
    options.focus,
  )
}

/** source -> validated IR -> ELK layout -> SVG string. Touches no DOM. */
export async function renderToSvg(
  source: string | unknown,
  options: RenderOptions = {},
): Promise<string> {
  const full = normalize(typeof source === 'string' ? parse(source) : source)
  const ir = selectView(full, options)
  const root = await layout(ir)
  options.onLayout?.(ir, root)
  const element = Diagram({
    root,
    ir,
    icons: toResolver(options.icons),
    theme: options.theme ?? defaultTheme,
    scenario: options.scenario,
  })
  return renderToStaticMarkup(element)
}
