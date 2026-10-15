import { DiagramError, type Ir } from './normalize.js'

export interface ViewOptions {
  /** Select one declared scenario; the default view still shows the complete graph. */
  scenario?: string
  /** Remove inactive elements and lay out the selected scenario again. */
  focus?: boolean
  /** Override the groups collapsed by the input; an empty array expands every group. */
  collapsed?: string[]
}

/** Apply scenario visibility before layout without changing the source IR. */
export function selectView(ir: Ir, options: ViewOptions = {}): Ir {
  return collapseGroups(scenarioView(ir, options), options.collapsed, ir)
}

function scenarioView(ir: Ir, options: ViewOptions): Ir {
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

/** Replace hidden endpoints by their outermost collapsed ancestor, preserving edge ids. */
function collapseGroups(ir: Ir, override: string[] | undefined, full: Ir): Ir {
  const collapsed = new Set(
    override ?? full.nodes.filter((node) => node.collapsed).map((node) => node.id),
  )
  for (const id of collapsed) {
    if (!full.nodes.some((node) => node.id === id && node.isGroup)) {
      throw new DiagramError(`Cannot collapse '${id}': it is not a group.`)
    }
  }
  if (!collapsed.size) return ir
  const byId = new Map(ir.nodes.map((node) => [node.id, node]))
  const visible = (id: string): string => {
    let found = id
    for (
      let cursor: string | null = id;
      cursor !== null;
      cursor = byId.get(cursor)?.parent ?? null
    ) {
      if (collapsed.has(cursor)) found = cursor
    }
    return found
  }
  return {
    ...ir,
    nodes: ir.nodes
      .filter((node) => visible(node.id) === node.id)
      .map((node) => (collapsed.has(node.id) ? { ...node, collapsed: true } : node)),
    edges: ir.edges.flatMap((edge) => {
      const from = visible(edge.from),
        to = visible(edge.to)
      if (from === to && (from !== edge.from || to !== edge.to)) return []
      return [{ ...edge, from, to }]
    }),
  }
}
