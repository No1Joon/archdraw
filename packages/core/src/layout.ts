import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { Ir } from './normalize.js'

/** The icon is the node; one constant sizes both. */
export const ICON_SIZE = 64
/** Space under each icon for its label. */
export const LABEL_BAND = 22
/** Extra space each additional label line takes. */
export const LINE_HEIGHT = 14
/** An address sits above the mark, smaller and muted, so it reads apart from the name. */
export const DOMAIN_SIZE = 11
export const DOMAIN_BAND = 16

/** GCP draws a service as a card: mark on the left, name beside it. */
export const CARD_ICON = 28
export const CARD_PADDING = 12
export const CARD_HEIGHT = 52
/** A node with no icon is a labelled box instead — third parties and self-hosted parts. */
export const BOX_HEIGHT = 40
export const BOX_PADDING = 14
export const GROUP_HEADER = 30
/** Left inset of a group's label, and its font size. */
export const GROUP_LABEL_INSET = 16
export const GROUP_LABEL_SIZE = 13
/** A group may carry its own icon in the header, beside the label. */
export const GROUP_ICON = 18
/** A diagram's own name, drawn above the graph. */
export const TITLE_SIZE = 18
export const TITLE_BAND = 44
/** Layout and render must use the same sizes. */
export const NODE_LABEL_SIZE = 12
export const EDGE_LABEL_SIZE = 11

/** Estimate — core has no font engine. CJK glyphs are full-width. */
const CJK = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/
function lineWidth(text: string, fontSize: number): number {
  let width = 0
  for (const character of text) width += (CJK.test(character) ? 1.03 : 0.53) * fontSize
  // Whole pixels keep float noise out of the rendered dimensions.
  return Math.ceil(width)
}

/** A label may hold several lines; the widest one decides the space it needs. */
export function labelWidth(text: string, fontSize: number): number {
  return Math.max(...text.split('\n').map((line) => lineWidth(line, fontSize)))
}

export function labelLines(text: string): string[] {
  return text.split('\n')
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
        if (node.type && node.shape === 'card') {
          const lines = labelLines(node.label)
          return {
            id: node.id,
            width: CARD_PADDING * 3 + CARD_ICON + labelWidth(node.label, NODE_LABEL_SIZE),
            height: Math.max(CARD_HEIGHT, CARD_PADDING * 2 + lines.length * LINE_HEIGHT),
          }
        }
        if (!node.type) {
          return {
            id: node.id,
            width: Math.max(ICON_SIZE, labelWidth(node.label, NODE_LABEL_SIZE) + BOX_PADDING * 2),
            height: BOX_HEIGHT + (labelLines(node.label).length - 1) * LINE_HEIGHT,
          }
        }
        return {
          id: node.id,
          width: Math.max(ICON_SIZE, node.domain ? labelWidth(node.domain, DOMAIN_SIZE) : 0),
          height: ICON_SIZE + (node.domain ? DOMAIN_BAND : 0),
          labels: [
            {
              text: node.label,
              width: labelWidth(node.label, NODE_LABEL_SIZE),
              height: LABEL_BAND + (labelLines(node.label).length - 1) * LINE_HEIGHT,
            },
          ],
          layoutOptions: { 'elk.nodeLabels.placement': '[OUTSIDE, V_BOTTOM, H_CENTER]' },
        }
      }
      return {
        id: node.id,
        labels: [{ text: node.label }],
        layoutOptions: {
          // A minimum width, not a label: a sized label would take a layout cell and shove
          // the children aside.
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          'elk.nodeSize.minimum': `(${
            GROUP_LABEL_INSET * 2 +
            (node.type ? GROUP_ICON + 8 : 0) +
            labelWidth(node.label, GROUP_LABEL_SIZE)
          },0)`,
          'elk.padding': `[top=${GROUP_HEADER + 16},left=20,bottom=${20 + LABEL_BAND},right=20]`,
        },
        children: build(node.id),
        edges: edgesOf.get(node.id) ?? [],
      }
    })

  const root = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': ir.direction,
      // Wrapping needs a shape to aim at; 1.6 is a landscape that fits a README or a slide.
      // MULTI_EDGE, not SINGLE_EDGE: the latter throws NoSuchElementException on a wrapped
      // graph whose groups an edge passes through.
      ...(ir.wrap
        ? {
            'elk.layered.wrapping.strategy': 'MULTI_EDGE',
            'elk.aspectRatio': '1.6',
            // ELK's pass that reroutes a wrapped edge is what strands its arrowhead in
            // open space; without it the same graphs wrap to within ten pixels of the
            // same box. It does not cover an edge that runs against `direction`, so
            // `reconnect` still has work to do.
            'elk.layered.wrapping.multiEdge.improveWrappedEdges': 'false',
          }
        : {}),
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

  reconnect(root)
  return root
}

interface Point {
  x: number
  y: number
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** ELK lands an endpoint on the border, so a whole pixel of slack is enough. */
const ON_BOX = 1

function onBox(point: Point, box: Box): boolean {
  return (
    point.x >= box.x - ON_BOX &&
    point.x <= box.x + box.w + ON_BOX &&
    point.y >= box.y - ON_BOX &&
    point.y <= box.y + box.h + ON_BOX
  )
}

/** Orthogonal route between two boxes, leaving and entering on the sides that face. */
function route(
  from: Box,
  to: Box,
): { startPoint: Point; endPoint: Point; bendPoints: [Point, Point] } {
  if (to.x >= from.x + from.w || to.x + to.w <= from.x) {
    const rightwards = to.x >= from.x + from.w
    const startPoint = { x: rightwards ? from.x + from.w : from.x, y: from.y + from.h / 2 }
    const endPoint = { x: rightwards ? to.x : to.x + to.w, y: to.y + to.h / 2 }
    const mid = (startPoint.x + endPoint.x) / 2
    return {
      startPoint,
      endPoint,
      bendPoints: [
        { x: mid, y: startPoint.y },
        { x: mid, y: endPoint.y },
      ],
    }
  }
  // The boxes share a column, so the run has to be vertical.
  const downwards = to.y >= from.y
  const startPoint = { x: from.x + from.w / 2, y: downwards ? from.y + from.h : from.y }
  const endPoint = { x: to.x + to.w / 2, y: downwards ? to.y : to.y + to.h }
  const mid = (startPoint.y + endPoint.y) / 2
  return {
    startPoint,
    endPoint,
    bendPoints: [
      { x: startPoint.x, y: mid },
      { x: endPoint.x, y: mid },
    ],
  }
}

/**
 * Wrapping can route an edge to a point that lies on no node: the arrowhead then claims a
 * connection and shows nowhere, which reads worse than a long detour because nothing on
 * the page says where the edge went. Any such edge is redrawn between the two boxes it
 * actually joins — a plainer line than ELK's, but one that lands.
 */
function reconnect(root: ElkNode): void {
  const boxes = new Map<string, Box>()
  const measure = (node: ElkNode, ox = 0, oy = 0) => {
    for (const child of node.children ?? []) {
      const x = ox + (child.x ?? 0)
      const y = oy + (child.y ?? 0)
      boxes.set(child.id, { x, y, w: child.width ?? 0, h: child.height ?? 0 })
      measure(child, x, y)
    }
  }
  measure(root)

  const walk = (node: ElkNode, ox = 0, oy = 0) => {
    for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) {
      const [from, to] = [edge.sources[0], edge.targets[0]]
      if (!from || !to) continue
      const source = boxes.get(from)
      const target = boxes.get(to)
      if (!source || !target) continue
      // ELK reports edge coordinates relative to the node the edge is declared on.
      const local = (box: Box): Box => ({ x: box.x - ox, y: box.y - oy, w: box.w, h: box.h })
      const sourceBox = local(source)
      const targetBox = local(target)
      for (const section of edge.sections ?? []) {
        if (onBox(section.startPoint, sourceBox) && onBox(section.endPoint, targetBox)) continue
        const fixed = route(sourceBox, targetBox)
        section.startPoint = fixed.startPoint
        section.endPoint = fixed.endPoint
        section.bendPoints = fixed.bendPoints
        // The label was placed against the route that missed, so it would sit by itself.
        const label = edge.labels?.[0]
        if (label) {
          const [first, second] = fixed.bendPoints
          label.x = (first.x + second.x) / 2 - (label.width ?? 0) / 2
          label.y = (first.y + second.y) / 2 - (label.height ?? 0) / 2
        }
      }
    }
    for (const child of node.children ?? []) {
      walk(child, ox + (child.x ?? 0), oy + (child.y ?? 0))
    }
  }
  walk(root)
}

export interface Detour {
  from: string
  to: string
  /** Routed length over the direct distance between the same two points. */
  ratio: number
  /** Runs against `direction`. Regrouping does not shorten one of these. */
  backward: boolean
}

/**
 * An edge whose endpoints sit in different groups is declared on their lowest common
 * ancestor, so ELK routes it around every container in between. The bundled examples
 * reach 1.32 when they lay out straight and start at 2.32 when they sprawl.
 */
export const DETOUR_RATIO = 2

export function detours(ir: Ir, root: ElkNode, threshold = DETOUR_RATIO): Detour[] {
  const collect = (node: ElkNode, out: ElkExtendedEdge[] = []): ElkExtendedEdge[] => {
    for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) out.push(edge)
    for (const child of node.children ?? []) collect(child, out)
    return out
  }

  // ELK reports a child relative to its parent, so a comparison across groups needs the sum.
  const centre = new Map<string, { x: number; y: number }>()
  const walk = (node: ElkNode, ox = 0, oy = 0) => {
    for (const child of node.children ?? []) {
      const x = ox + (child.x ?? 0)
      const y = oy + (child.y ?? 0)
      centre.set(child.id, { x: x + (child.width ?? 0) / 2, y: y + (child.height ?? 0) / 2 })
      walk(child, x, y)
    }
  }
  walk(root)

  const runsBackward = (from: string, to: string) => {
    const a = centre.get(from)
    const b = centre.get(to)
    if (!a || !b) return false
    return ir.direction === 'RIGHT' ? b.x < a.x : b.y < a.y
  }

  const found: Detour[] = []
  for (const edge of collect(root)) {
    const source = ir.edges[Number(edge.id.slice(1))]
    if (!source) continue
    for (const section of edge.sections ?? []) {
      let routed = 0
      let previous = section.startPoint
      for (const point of [...(section.bendPoints ?? []), section.endPoint]) {
        routed += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)
        previous = point
      }
      const direct =
        Math.abs(section.endPoint.x - section.startPoint.x) +
        Math.abs(section.endPoint.y - section.startPoint.y)
      // A near-zero direct distance says the endpoints overlap, not that the route is bad.
      if (direct < 1) continue
      const ratio = routed / direct
      if (ratio >= threshold) {
        found.push({
          from: source.from,
          to: source.to,
          ratio,
          backward: runsBackward(source.from, source.to),
        })
      }
    }
  }
  return found.sort((a, b) => b.ratio - a.ratio)
}
