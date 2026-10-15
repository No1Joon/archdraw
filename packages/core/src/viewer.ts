import { renderToStaticMarkup } from 'react-dom/server'
import { createResolver, type IconPack } from './icons.js'
import { layout } from './layout.js'
import type { Ir } from './normalize.js'
import { Diagram, type Theme } from './render.js'
import { selectView, type ViewOptions } from './view.js'

/** The offline page uses the same projection, layout and SVG components as Node. */
export async function renderView(
  ir: Ir,
  icons: IconPack,
  theme: Theme,
  options: ViewOptions,
): Promise<string> {
  const view = selectView(ir, options)
  const root = await layout(view)
  return renderToStaticMarkup(
    Diagram({
      root,
      ir: view,
      icons: createResolver(icons),
      theme,
      flow: true,
      scenario: options.scenario,
    }),
  )
}
