import type { ElkNode } from 'elkjs'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { Ir } from './normalize.js'

export const NODE_WIDTH = 148
export const NODE_HEIGHT = 104
export const ICON_SIZE = 48
export const GROUP_HEADER = 30

const elk = new ELK()

/** Runs ELK over the flat IR. Group nesting becomes ELK compound nodes. */
export async function layout(ir: Ir): Promise<ElkNode> {
  const childrenOf = new Map<string | null, typeof ir.nodes>()
  for (const node of ir.nodes) {
    const list = childrenOf.get(node.parent) ?? []
    list.push(node)
    childrenOf.set(node.parent, list)
  }

  const build = (parent: string | null): ElkNode[] =>
    (childrenOf.get(parent) ?? []).map((node) => {
      if (!node.isGroup) {
        return {
          id: node.id,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          labels: [{ text: node.label }],
        }
      }
      return {
        id: node.id,
        labels: [{ text: node.label }],
        layoutOptions: {
          'elk.padding': `[top=${GROUP_HEADER + 16},left=20,bottom=20,right=20]`,
        },
        children: build(node.id),
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
    edges: ir.edges.map((edge, index) => ({
      id: `e${index}`,
      sources: [edge.from],
      targets: [edge.to],
    })),
  })
}
