import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import { simplify } from './fold.js'
import { DiagramError, type Ir } from './normalize.js'

interface Point {
  x: number
  y: number
}
interface Rect extends Point {
  width: number
  height: number
}
type QueueItem = [score: number, state: number, cost: number]
const GAP = 10

class Queue {
  items: QueueItem[] = []
  push(value: QueueItem) {
    let i = this.items.length
    this.items.push(value)
    while (i > 0) {
      const p = (i - 1) >> 1
      if ((this.items[p] as QueueItem)[0] <= value[0]) break
      this.items[i] = this.items[p] as QueueItem
      i = p
    }
    this.items[i] = value
  }
  pop(): QueueItem | undefined {
    const first = this.items[0],
      tail = this.items.pop()
    if (!tail || !this.items.length) return first
    let i = 0
    while (i * 2 + 1 < this.items.length) {
      let c = i * 2 + 1
      if (
        c + 1 < this.items.length &&
        (this.items[c + 1] as QueueItem)[0] < (this.items[c] as QueueItem)[0]
      )
        c++
      if ((this.items[c] as QueueItem)[0] >= tail[0]) break
      this.items[i] = this.items[c] as QueueItem
      i = c
    }
    this.items[i] = tail
    return first
  }
}

function crosses(a: Point, b: Point, r: Rect): boolean {
  if (Math.abs(a.x - b.x) < 0.01)
    return (
      a.x > r.x - 6 &&
      a.x < r.x + r.width + 6 &&
      Math.max(a.y, b.y) > r.y - 6 &&
      Math.min(a.y, b.y) < r.y + r.height + 6
    )
  return (
    a.y > r.y - 6 &&
    a.y < r.y + r.height + 6 &&
    Math.max(a.x, b.x) > r.x - 6 &&
    Math.min(a.x, b.x) < r.x + r.width + 6
  )
}

/** A rectilinear visibility grid keeps folded return stems out of nodes and labels. */
function corridor(start: Point, end: Point, obstacles: Rect[], minY: number): Point[] | undefined {
  const unique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b)
  const xs = unique(
    [start.x, end.x, 8, ...obstacles.flatMap((r) => [r.x - GAP, r.x + r.width + GAP])].filter(
      (x) => x >= 0,
    ),
  )
  const ys = unique(
    [start.y, end.y, minY, ...obstacles.flatMap((r) => [r.y - GAP, r.y + r.height + GAP])].filter(
      (y) => y >= minY,
    ),
  )
  const width = xs.length,
    count = width * ys.length
  const position = (id: number): Point => ({
    x: xs[id % width] as number,
    y: ys[Math.floor(id / width)] as number,
  })
  const initial = ys.indexOf(start.y) * width + xs.indexOf(start.x)
  const goal = ys.indexOf(end.y) * width + xs.indexOf(end.x)
  const cost = new Float64Array(count * 3).fill(Number.POSITIVE_INFINITY)
  const previous = new Int32Array(count * 3).fill(-1)
  const open = new Queue()
  const heuristic = (p: Point) => Math.abs(p.x - end.x) + Math.abs(p.y - end.y)
  cost[initial * 3] = 0
  open.push([heuristic(start), initial * 3, 0])
  while (open.items.length) {
    const [, state, distance] = open.pop() as QueueItem
    if (distance !== cost[state]) continue
    const id = Math.floor(state / 3),
      dir = state % 3,
      point = position(id)
    if (id === goal) {
      const path: Point[] = []
      for (let cursor = state; cursor !== -1; cursor = previous[cursor] as number)
        path.push(position(Math.floor(cursor / 3)))
      return simplify(path.reverse())
    }
    const x = id % width,
      y = Math.floor(id / width)
    for (const [nx, ny, direction] of [
      [x + 1, y, 1],
      [x, y + 1, 2],
      [x - 1, y, 1],
      [x, y - 1, 2],
    ] as [number, number, number][]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= ys.length) continue
      const next = ny * width + nx,
        at = position(next)
      if (obstacles.some((r) => crosses(point, at, r))) continue
      const candidate =
        distance +
        Math.abs(at.x - point.x) +
        Math.abs(at.y - point.y) +
        (dir && dir !== direction ? 14 : 0)
      const target = next * 3 + direction
      if (candidate >= (cost[target] as number)) continue
      cost[target] = candidate
      previous[target] = state
      open.push([candidate + heuristic(at), target, candidate])
    }
  }
}

/** Return lanes are added after folding; their space becomes part of the enclosing box. */
export function routeBackEdges(
  root: ElkNode,
  ir: Ir,
  parent: string | null,
  direction: 'RIGHT' | 'DOWN',
  measure: (label: string) => number,
  labelHeight: number,
): void {
  const back = ir.edges
    .map((edge, index) => ({ edge, index }))
    .filter(
      ({ edge }) =>
        edge.layout === 'back' && ir.nodes.find((node) => node.id === edge.from)?.parent === parent,
    )
  if (!back.length) return
  const nodes = new Map((root.children ?? []).map((node) => [node.id, node]))
  const bounds = new Map<string, Rect>()
  for (const node of root.children ?? []) {
    const meta = ir.nodes.find((entry) => entry.id === node.id)
    const label =
      meta?.type && meta.shape === 'icon' && !meta.isGroup ? node.labels?.[0] : undefined
    const width = Math.max(node.width ?? 0, label?.width ?? 0)
    bounds.set(node.id, {
      x: (node.x ?? 0) - (width - (node.width ?? 0)) / 2,
      y: node.y ?? 0,
      width,
      height: (node.height ?? 0) + (label?.height ?? 0),
    })
  }
  const obstacles = [...bounds.values()]
  for (const edge of (root.edges ?? []) as ElkExtendedEdge[])
    for (const label of edge.labels ?? []) {
      obstacles.push({
        x: label.x ?? 0,
        y: label.y ?? 0,
        width: label.width ?? 0,
        height: label.height ?? 0,
      })
    }
  const incidents = new Map<string, string[]>()
  for (const { edge, index } of back)
    for (const end of ['from', 'to'] as const) {
      const list = incidents.get(edge[end]) ?? []
      list.push(`${index}:${end}`)
      incidents.set(edge[end], list)
    }
  const anchor = (id: string, token: string): { at: Point; outside: Point } => {
    const node = nodes.get(id) as ElkNode,
      box = bounds.get(id) as Rect
    const list = incidents.get(id) as string[]
    const fraction = (list.indexOf(token) + 1) / (list.length + 1)
    const x = node.x ?? 0,
      y = node.y ?? 0
    return direction === 'RIGHT'
      ? {
          at: { x: x + (node.width ?? 0) * fraction, y: y + (node.height ?? 0) },
          outside: { x: x + (node.width ?? 0) * fraction, y: box.y + box.height + GAP },
        }
      : {
          at: { x: x + (node.width ?? 0), y: y + (node.height ?? 0) * fraction },
          outside: { x: box.x + box.width + GAP, y: y + (node.height ?? 0) * fraction },
        }
  }
  const base =
    direction === 'RIGHT'
      ? Math.max(root.height ?? 0, ...obstacles.map((r) => r.y + r.height)) + 24
      : Math.max(root.width ?? 0, ...obstacles.map((r) => r.x + r.width)) + 24
  const spacing =
    direction === 'RIGHT'
      ? labelHeight + 24
      : Math.max(24, ...back.map(({ edge }) => (edge.label ? measure(edge.label) + 24 : 24)))
  const minY = parent === null ? 8 : 38
  for (const [lane, { edge, index }] of back.entries()) {
    const from = anchor(edge.from, `${index}:from`),
      to = anchor(edge.to, `${index}:to`)
    const rail = base + lane * spacing
    const a =
      direction === 'RIGHT' ? { x: from.outside.x, y: rail } : { x: rail, y: from.outside.y }
    const b = direction === 'RIGHT' ? { x: to.outside.x, y: rail } : { x: rail, y: to.outside.y }
    if (direction === 'RIGHT' && Math.abs(a.x - b.x) < 0.01) {
      a.x += GAP
      b.x -= GAP
    }
    if (direction === 'DOWN' && Math.abs(a.y - b.y) < 0.01) {
      a.y += GAP
      b.y -= GAP
    }
    const head = corridor(from.outside, a, obstacles, minY),
      tail = corridor(to.outside, b, obstacles, minY)
    if (!head || !tail)
      throw new DiagramError(
        `Cannot route back edge '${edge.id}' without crossing a node or label.`,
        'Shorten labels, give the group more room, or choose a different local direction.',
        {
          code: 'routing-failed',
          path: ['edges', index, 'layout'],
          elements: [{ kind: 'edge', id: edge.id }],
        },
      )
    const points = simplify([from.at, ...head, ...tail.reverse(), to.at])
    const width = edge.label ? measure(edge.label) : 0
    const label =
      direction === 'RIGHT'
        ? {
            x: Math.max(8, (a.x + b.x - width) / 2),
            y: rail + 8,
            width,
            height: labelHeight,
            text: edge.label,
          }
        : {
            x: rail + 8,
            y: Math.max(minY, (a.y + b.y - labelHeight) / 2),
            width,
            height: labelHeight,
            text: edge.label,
          }
    const routed: ElkExtendedEdge = {
      id: `e${index}`,
      sources: [edge.from],
      targets: [edge.to],
      labels: edge.label ? [label] : [],
      sections: [
        {
          id: `e${index}_back`,
          startPoint: points[0] as Point,
          endPoint: points[points.length - 1] as Point,
          bendPoints: points.slice(1, -1),
        },
      ],
    }
    root.edges ??= []
    root.edges.push(routed)
    root.width = Math.max(
      root.width ?? 0,
      ...points.map((p) => p.x + 20),
      edge.label ? label.x + width + 20 : 0,
    )
    root.height = Math.max(
      root.height ?? 0,
      ...points.map((p) => p.y + 20),
      edge.label ? label.y + labelHeight + 20 : 0,
    )
    if (edge.label) obstacles.push(label)
  }
  const sides = new Map(
    ir.nodes
      .find((node) => node.id === parent)
      ?.ports?.map((port) => [`${parent}>port:${port.id}`, port.side]),
  )
  for (const port of root.ports ?? []) {
    const old = { x: port.x ?? 0, y: port.y ?? 0 },
      side = sides.get(port.id)
    if (side === 'EAST') port.x = root.width
    if (side === 'SOUTH') port.y = root.height
    if (old.x === port.x && old.y === port.y) continue
    for (const edge of (root.edges ?? []) as ElkExtendedEdge[])
      for (const section of edge.sections ?? []) {
        if (edge.sources.includes(port.id)) {
          section.bendPoints = [old, ...(section.bendPoints ?? [])]
          section.startPoint = { x: port.x ?? old.x, y: port.y ?? old.y }
        }
        if (edge.targets.includes(port.id)) {
          section.bendPoints = [...(section.bendPoints ?? []), old]
          section.endPoint = { x: port.x ?? old.x, y: port.y ?? old.y }
        }
      }
  }
}

/** Incoming boundary hops meet the declared entry directly on its leading side. */
export function alignEntryPorts(root: ElkNode, ir: Ir, parent: string): void {
  const group = ir.nodes.find((node) => node.id === parent)
  const entry = root.children?.find((node) => node.id === group?.entry)
  if (!group?.entry || !entry) return
  for (const declared of group.ports ?? []) {
    if (declared.side !== 'WEST' && declared.side !== 'NORTH') continue
    const hops = ir.edges
      .map((edge, index) => ({ edge, index }))
      .filter(
        ({ edge }) =>
          edge.from === parent &&
          edge.fromPort === declared.id &&
          edge.to === group.entry &&
          !edge.toPort,
      )
    if (!hops.length) continue
    const id = `${parent}>port:${declared.id}`
    const port = root.ports?.find((port) => port.id === id)
    if (!port) continue
    const old = { x: port.x ?? 0, y: port.y ?? 0 }
    const end =
      declared.side === 'WEST'
        ? { x: entry.x ?? 0, y: (entry.y ?? 0) + (entry.height ?? 0) / 2 }
        : { x: (entry.x ?? 0) + (entry.width ?? 0) / 2, y: entry.y ?? 0 }
    const start = declared.side === 'WEST' ? { x: 0, y: end.y } : { x: end.x, y: 0 }
    port.x = start.x
    port.y = start.y
    for (const edge of (root.edges ?? []) as ElkExtendedEdge[])
      for (const section of edge.sections ?? []) {
        if (hops.some((h) => edge.id === `e${h.index}`)) {
          section.startPoint = start
          section.endPoint = end
          section.bendPoints = []
        } else if (edge.sources.includes(id)) {
          section.startPoint = start
          section.bendPoints = [old, ...(section.bendPoints ?? [])]
        } else if (edge.targets.includes(id)) {
          section.endPoint = start
          section.bendPoints = [...(section.bendPoints ?? []), old]
        }
      }
  }
}

/** Boundary bridges can cross a return lane; its label uses the nearest clear span. */
export function clearReturnLabels(
  root: ElkNode,
  ir: Ir,
  parent: string | null,
  direction: 'RIGHT' | 'DOWN',
): void {
  const edges = (root.edges ?? []) as ElkExtendedEdge[]
  const segments = edges.flatMap((edge) =>
    (edge.sections ?? []).flatMap((section) => {
      const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
      return points.slice(1).map((b, index) => ({ a: points[index] as Point, b }))
    }),
  )
  const nodes = (root.children ?? []).map((node) => ({
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 0,
    height: node.height ?? 0,
  }))
  for (const routed of edges) {
    const meta = ir.edges[Number(routed.id.slice(1))]
    const label = routed.labels?.[0]
    if (
      meta?.layout !== 'back' ||
      !label ||
      ir.nodes.find((node) => node.id === meta.from)?.parent !== parent
    )
      continue
    const rect = {
      x: label.x ?? 0,
      y: label.y ?? 0,
      width: label.width ?? 0,
      height: label.height ?? 0,
    }
    const horizontal = direction === 'RIGHT',
      axis = horizontal ? 'x' : 'y',
      length = horizontal ? rect.width : rect.height
    const candidates = [
      rect[axis],
      ...segments.flatMap((s) => [
        s.a[axis] + 8,
        s.a[axis] - length - 8,
        s.b[axis] + 8,
        s.b[axis] - length - 8,
      ]),
    ]
      .filter(
        (n) =>
          n >= (horizontal ? 8 : parent === null ? 8 : 38) &&
          n + length + 20 <= (horizontal ? (root.width ?? 0) : (root.height ?? 0)),
      )
      .sort((a, b) => Math.abs(a - rect[axis]) - Math.abs(b - rect[axis]))
    const other = edges.flatMap((edge) =>
      (edge.labels ?? [])
        .filter((l) => l !== label)
        .map((l) => ({ x: l.x ?? 0, y: l.y ?? 0, width: l.width ?? 0, height: l.height ?? 0 })),
    )
    const overlaps = (a: Rect, b: Rect) =>
      a.x < b.x + b.width + 6 &&
      a.x + a.width + 6 > b.x &&
      a.y < b.y + b.height + 6 &&
      a.y + a.height + 6 > b.y
    const found = candidates.find((at) => {
      const candidate = { ...rect, [axis]: at }
      return (
        !segments.some((s) => crosses(s.a, s.b, candidate)) &&
        !other.some((r) => overlaps(candidate, r)) &&
        !nodes.some((r) => overlaps(candidate, r))
      )
    })
    if (found === undefined) continue
    label[axis] = found
  }
}
