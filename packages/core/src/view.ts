import { DiagramError, type Ir } from './normalize.js'

export interface ViewOptions {
  /** Select one declared scenario; the default view still shows the complete graph. */
  scenario?: string
  /** Remove inactive elements and lay out the selected scenario again. */
  focus?: boolean
}

/** Apply scenario visibility before layout without changing the source IR. */
export function selectView(ir: Ir, options: ViewOptions = {}): Ir {
  const { scenario, focus } = options
  if (focus && !scenario) throw new DiagramError('Focus requires a scenario id.')
  if (!scenario) return ir
  if (!ir.scenarios.some((entry) => entry.id === scenario)) {
    throw new DiagramError(`Unknown scenario '${scenario}'.`, 'Use an id from `scenarios`.')
  }
  if (!focus) return ir
  const byId = new Map(ir.nodes.map((node) => [node.id, node]))
  const active = (id: string): boolean => {
    const node = byId.get(id)
    if (!node) return false
    if (node.when && !node.when.includes(scenario) && !node.down?.includes(scenario)) return false
    return node.parent === null || active(node.parent)
  }
  const nodes = ir.nodes.filter((node) => active(node.id))
  return {
    ...ir,
    nodes,
    edges: ir.edges.filter(
      (edge) =>
        (!edge.when || edge.when.includes(scenario)) && active(edge.from) && active(edge.to),
    ),
  }
}
