import type { ElkNode } from 'elkjs'
import { renderToStaticMarkup } from 'react-dom/server'
import { parse as parseYaml } from 'yaml'
import { page } from './html.js'
import { createResolver, type IconPack, type IconResolver } from './icons.js'
import { layout } from './layout.js'
import type { Ir } from './normalize.js'
import { normalize } from './normalize.js'
import { Diagram, defaultTheme, FLOW_DURATION, FLOW_PERIOD, type Theme } from './render.js'
import { selectView, type ViewOptions } from './view.js'

export type { ElkNode } from 'elkjs'
export type { Bounds, Diagnostic, ElementRef, Point, QualityReport } from './diagnostics.js'
export { diagnose } from './diagnostics.js'
export type { IconAsset, IconPack, IconResolver } from './icons.js'
export { createResolver } from './icons.js'
export type { Detour } from './layout.js'
export { DETOUR_RATIO, detours, layout } from './layout.js'
export type { FlatNode, Ir, IrEdge } from './normalize.js'
export { DiagramError, normalize } from './normalize.js'
export type { DiagramProps, Theme } from './render.js'
export { Diagram, darkTheme, defaultTheme } from './render.js'
export type { Diagram as DiagramInput, Edge, FlatDiagram, NodeEntry, Port } from './schema.js'
export {
  DiagramSchema,
  EdgeSchema,
  FlatDiagramSchema,
  FlatNodeSchema,
  NodeEntrySchema,
  PortSchema,
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
  const resolver = toResolver(options.icons)
  for (const node of full.nodes) {
    if (node.type) resolver.resolve(node.type)
  }
  const ir = selectView(full, options)
  const root = await layout(ir)
  options.onLayout?.(ir, root)
  const theme = options.theme ?? defaultTheme
  const svg = renderToStaticMarkup(
    Diagram({ root, ir, icons: resolver, theme, flow: true, scenario: options.scenario }),
  )
  const icons: IconPack = { provider: full.provider, icons: Object.create(null), aliases: {} }
  for (const node of full.nodes) {
    if (node.type) icons.icons[node.type] = resolver.resolve(node.type)
  }
  return page(
    svg,
    ir.title ?? 'architecture diagram',
    theme,
    ir.nodes.some((n) => n.external),
    ir.scenarios,
    options.live,
    {
      ir: full,
      icons,
      options: { scenario: options.scenario, focus: options.focus, collapsed: options.collapsed },
    },
  )
}

/** source -> validated IR -> ELK layout -> SVG string. Touches no DOM. */
export async function renderToSvg(
  source: string | unknown,
  options: RenderOptions = {},
): Promise<string> {
  const full = normalize(typeof source === 'string' ? parse(source) : source)
  const resolver = toResolver(options.icons)
  for (const node of full.nodes) {
    if (node.type) resolver.resolve(node.type)
  }
  const ir = selectView(full, options)
  const root = await layout(ir)
  options.onLayout?.(ir, root)
  const element = Diagram({
    root,
    ir,
    icons: resolver,
    theme: options.theme ?? defaultTheme,
    scenario: options.scenario,
  })
  return renderToStaticMarkup(element)
}

export interface SvgFrame {
  svg: string
  /** Time to display this frame, in milliseconds. */
  delay: number
}

/** One seamless flow cycle at 20 fps, with a single layout shared by all frames. */
export async function* renderToSvgFrames(
  source: string | unknown,
  options: RenderOptions = {},
): AsyncGenerator<SvgFrame> {
  const full = normalize(typeof source === 'string' ? parse(source) : source)
  const resolver = toResolver(options.icons)
  for (const node of full.nodes) {
    if (node.type) resolver.resolve(node.type)
  }
  const ir = selectView(full, options)
  const root = await layout(ir)
  options.onLayout?.(ir, root)
  const count = 24
  for (let index = 0; index < count; index++) {
    yield {
      svg: renderToStaticMarkup(
        Diagram({
          root,
          ir,
          icons: resolver,
          theme: options.theme ?? defaultTheme,
          flow: true,
          flowOffset: (-FLOW_PERIOD * index) / count,
          scenario: options.scenario,
        }),
      ),
      delay: FLOW_DURATION / count,
    }
  }
}
