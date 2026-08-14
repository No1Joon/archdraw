import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { Ir } from './normalize.js'

/** The icon is the node; one constant sizes both. */
export const ICON_SIZE = 64
/** Space under each icon for its label. */
export const LABEL_BAND = 22
export const GROUP_HEADER = 30
/** Layout and render must use the same sizes. */
export const NODE_LABEL_SIZE = 12
export const EDGE_LABEL_SIZE = 11

/** Estimate — core has no font engine. CJK glyphs are full-width. */
const CJK = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/
function labelWidth(text: string, fontSize: number): number {
  let width = 0
  for (const character of text) width += (CJK.test(character) ? 1.03 : 0.53) * fontSize
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

  // ELK reports edge coordinates relative to the node the edge is declared on.
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
    // ELK places a label only when given its dimensions.
    list.push({
      id: `e${index}`,
      sources: [edge.from],
      targets: [edge.to],
      labels: edge.label
        ? [
            {
              text: edge.label,
              width: labelWidth(edge.label, EDGE_LABEL_SIZE),
              height: EDGE_LABEL_SIZE + 4,
            },
          ]
        : [],
    })
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
              width: labelWidth(node.label, NODE_LABEL_SIZE),
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
      'elk.edgeLabels.placement': 'CENTER',
      'elk.spacing.edgeLabel': '6',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    },
    children: build(null),
    edges: edgesOf.get(null) ?? [],
  })
}
