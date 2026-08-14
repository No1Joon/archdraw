import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { Ir } from './normalize.js'

/** The icon is the node — there is no card around it, so one constant sizes both. */
export const ICON_SIZE = 64
/** Reserved under each icon for its label, which ELK places outside the node. */
export const LABEL_BAND = 22
export const GROUP_HEADER = 30

/**
 * Label width without a font engine — core runs in Node and the browser and touches neither
 * DOM nor canvas, so it estimates. CJK glyphs are full-width and run about twice a latin
 * character; treating them the same lets neighbouring labels overlap.
 */
const CJK = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/
function labelWidth(text: string): number {
  let width = 0
  for (const character of text) width += CJK.test(character) ? 12.4 : 6.4
  return width
}

const elk = new ELK()

/** Runs ELK over the flat IR. Group nesting becomes ELK compound nodes. */
export async function layout(ir: Ir): Promise<ElkNode> {
  const childrenOf = new Map<string | null, typeof ir.nodes>()
  for (const node of ir.nodes) {
    const list = childrenOf.get(node.parent) ?? []
    list.push(node)
    childrenOf.set(node.parent, list)
  }

  // ELK reports an edge's coordinates relative to the node the edge is declared on, so each
  // edge belongs on the lowest container holding both of its endpoints. Declaring them all on
  // the root draws a group's inner edges at the root origin instead of the group's.
  const parentOf = new Map(ir.nodes.map((node) => [node.id, node.parent]))
  const containersOf = (id: string): (string | null)[] => {
    const chain: (string | null)[] = []
    for (let cursor = parentOf.get(id) ?? null; cursor; cursor = parentOf.get(cursor) ?? null) {
      chain.push(cursor)
    }
    chain.push(null)
    return chain
  }

  const edgesOf = new Map<string | null, ElkExtendedEdge[]>()
  ir.edges.forEach((edge, index) => {
    const enclosing = new Set(containersOf(edge.to))
    const lca = containersOf(edge.from).find((id) => enclosing.has(id)) ?? null
    const list = edgesOf.get(lca) ?? []
    list.push({ id: `e${index}`, sources: [edge.from], targets: [edge.to] })
    edgesOf.set(lca, list)
  })

  const build = (parent: string | null): ElkNode[] =>
    (childrenOf.get(parent) ?? []).map((node): ElkNode => {
      if (!node.isGroup) {
        return {
          id: node.id,
          width: ICON_SIZE,
          height: ICON_SIZE,
          labels: [
            {
              text: node.label,
              width: labelWidth(node.label),
              height: LABEL_BAND,
            },
          ],
          layoutOptions: { 'elk.nodeLabels.placement': '[OUTSIDE, V_BOTTOM, H_CENTER]' },
        }
      }
      return {
        id: node.id,
        labels: [{ text: node.label }],
        layoutOptions: {
          'elk.padding': `[top=${GROUP_HEADER + 16},left=20,bottom=${20 + LABEL_BAND},right=20]`,
        },
        children: build(node.id),
        edges: edgesOf.get(node.id) ?? [],
      }
    })

  return elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ir.direction,
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '48',
      'elk.layered.spacing.nodeNodeBetweenLayers': '72',
      'elk.spacing.edgeNode': '24',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    },
    children: build(null),
    edges: edgesOf.get(null) ?? [],
  })
}
