import type { ElkEdgeSection, ElkExtendedEdge, ElkLabel, ElkNode } from 'elkjs'

/** Wrapping aims at a landscape that fits a README or a slide. */
const ASPECT = 1.6
/** Space between a row and the wrapped edges that run beside it. */
const CLEARANCE = 24
/** Space between two wrapped edges that run side by side. */
const LANE = 10

interface Point {
  x: number
  y: number
}

interface Span {
  start: number
  end: number
}

/** A stretch of one polyline that stays inside one strip. */
interface Piece {
  zone: number
  points: Point[]
}

/** Where a polyline crosses a cut, and which way. */
interface Crossing {
  cut: number
  forward: boolean
  /** The crossing's height on the strip before the cut and on the strip after it. */
  before: number
  after: number
  lane: number
}

/**
 * Folds a laid-out graph into rows along the order the layout already reads in, so a chain
 * reads left to right and then on down the page. ELK's own wrapping cuts by layer index and
 * sends a reader backwards; it also cannot be told where to cut from elkjs, and a row inside
 * the hierarchy cannot run in a different direction from its parent, so the fold is ours.
 * A `DOWN` diagram folds into columns the same way, by laying the picture on its side.
 */
export function fold(root: ElkNode, direction: 'RIGHT' | 'DOWN'): void {
  if (direction === 'DOWN') transpose(root)
  foldRows(root, direction === 'DOWN' ? 1 / ASPECT : ASPECT)
  if (direction === 'DOWN') transpose(root)
}

function swap(point: Point): void {
  ;[point.x, point.y] = [point.y, point.x]
}

function swapBox(box: { x?: number; y?: number; width?: number; height?: number }): void {
  ;[box.x, box.y] = [box.y, box.x]
  ;[box.width, box.height] = [box.height, box.width]
}

function transpose(node: ElkNode): void {
  swapBox(node)
  for (const label of node.labels ?? []) swapBox(label)
  for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) {
    for (const label of edge.labels ?? []) swapBox(label)
    for (const point of sectionPoints(edge)) swap(point)
  }
  for (const child of node.children ?? []) transpose(child)
}

function sectionPoints(edge: ElkExtendedEdge): Point[] {
  return (edge.sections ?? []).flatMap((section) => [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
    ...((section as { junctionPoints?: Point[] }).junctionPoints ?? []),
  ])
}

function polyline(section: ElkEdgeSection): Point[] {
  return [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
}

/** A node with its outside label: an icon's name hangs below it and is often the wider. */
function extent(node: ElkNode): { x: Span; y: Span } {
  const x = node.x ?? 0
  const y = node.y ?? 0
  const spans = [{ x0: x, y0: y, x1: x + (node.width ?? 0), y1: y + (node.height ?? 0) }]
  for (const label of node.labels ?? []) {
    if (label.width === undefined || label.height === undefined) continue
    const lx = x + (label.x ?? 0)
    const ly = y + (label.y ?? 0)
    spans.push({ x0: lx, y0: ly, x1: lx + label.width, y1: ly + label.height })
  }
  return {
    x: { start: Math.min(...spans.map((s) => s.x0)), end: Math.max(...spans.map((s) => s.x1)) },
    y: { start: Math.min(...spans.map((s) => s.y0)), end: Math.max(...spans.map((s) => s.y1)) },
  }
}

function labelExtent(label: ElkLabel): { x: Span; y: Span } {
  const x = label.x ?? 0
  const y = label.y ?? 0
  return {
    x: { start: x, end: x + (label.width ?? 0) },
    y: { start: y, end: y + (label.height ?? 0) },
  }
}

function foldRows(root: ElkNode, aspect: number): void {
  // A diagram drawn inside one group folds inside it; everything above holds that one box.
  const path: ElkNode[] = [root]
  for (let node = root; node.children?.length === 1 && node.children[0]?.children?.length; ) {
    node = node.children[0]
    path.push(node)
  }
  const holder = path[path.length - 1] as ElkNode
  const children = holder.children ?? []
  if (children.length < 2) return

  // Every edge the fold can cut, moved into the holder's frame; ELK reports an edge relative to
  // the node it is declared on.
  const offsets = path.map((_, index) =>
    path
      .slice(index + 1)
      .reduce((sum, node) => ({ x: sum.x + (node.x ?? 0), y: sum.y + (node.y ?? 0) }), {
        x: 0,
        y: 0,
      }),
  )
  const edges: ElkExtendedEdge[] = []
  path.forEach((node, index) => {
    const offset = offsets[index] as Point
    for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) {
      for (const point of sectionPoints(edge)) {
        point.x -= offset.x
        point.y -= offset.y
      }
      for (const label of edge.labels ?? []) {
        label.x = (label.x ?? 0) - offset.x
        label.y = (label.y ?? 0) - offset.y
      }
      edges.push(edge)
    }
  })
  const restore = () =>
    path.forEach((node, index) => {
      const offset = offsets[index] as Point
      for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) {
        for (const point of sectionPoints(edge)) {
          point.x += offset.x
          point.y += offset.y
        }
        for (const label of edge.labels ?? []) {
          label.x = (label.x ?? 0) + offset.x
          label.y = (label.y ?? 0) + offset.y
        }
      }
    })

  const before = bounds(children, edges)
  const labels = edges.flatMap((edge) => edge.labels ?? [])
  const things = [...children.map(extent), ...labels.map(labelExtent)]

  // A cut may fall only where nothing straddles it, so a group is never split between rows.
  const blocks: { x: Span; y: Span }[] = []
  for (const thing of [...things].sort((a, b) => a.x.start - b.x.start)) {
    const last = blocks[blocks.length - 1]
    if (last && thing.x.start < last.x.end) {
      last.x.end = Math.max(last.x.end, thing.x.end)
      last.y.start = Math.min(last.y.start, thing.y.start)
      last.y.end = Math.max(last.y.end, thing.y.end)
    } else {
      blocks.push({ x: { ...thing.x }, y: { ...thing.y } })
    }
  }
  if (blocks.length < 2) {
    restore()
    return
  }
  const gaps = blocks.slice(1).map((block, index) => {
    const before = (blocks[index] as { x: Span }).x.end
    return { at: (before + block.x.start) / 2, half: (block.x.start - before) / 2 }
  })
  const zoneOf = (x: number, cuts: number[]) => {
    let zone = 0
    while (zone < cuts.length && x >= (cuts[zone] as number)) zone++
    return zone
  }

  // Edges run between the blocks too, and a row has to be as tall as what passes through it.
  const allCuts = gaps.map((gap) => gap.at)
  const crossings = allCuts.map(() => 0)
  for (const edge of edges) {
    for (const section of edge.sections ?? []) {
      const points = polyline(section)
      for (let index = 1; index < points.length; index++) {
        const a = points[index - 1] as Point
        const b = points[index] as Point
        const from = zoneOf(Math.min(a.x, b.x), allCuts)
        const to = zoneOf(Math.max(a.x, b.x), allCuts)
        for (let zone = from; zone <= to; zone++) {
          const block = blocks[zone] as { y: Span }
          block.y.start = Math.min(block.y.start, a.y, b.y)
          block.y.end = Math.max(block.y.end, a.y, b.y)
        }
        for (let cut = from; cut < to; cut++) crossings[cut] = (crossings[cut] ?? 0) + 1
      }
    }
  }

  // For each row count, the cuts that keep the widest row narrowest; then the count whose
  // picture comes closest to the aspect wrapping aims at.
  const width = (first: number, last: number) =>
    (blocks[last] as { x: Span }).x.end - (blocks[first] as { x: Span }).x.start
  const count = blocks.length
  const lanes = (n: number) => Math.max(0, n - 1) * LANE
  let best: { score: number; breaks: number[] } = { score: Number.POSITIVE_INFINITY, breaks: [] }
  for (let rows = 1; rows <= count; rows++) {
    const breaks = balance(count, rows, width)
    const starts = [0, ...breaks]
    const ends = [...breaks.map((b) => b - 1), count - 1]
    let wide = 0
    let high = 0
    starts.forEach((first, row) => {
      const last = ends[row] as number
      wide = Math.max(wide, width(first, last))
      let top = Number.POSITIVE_INFINITY
      let bottom = Number.NEGATIVE_INFINITY
      for (let index = first; index <= last; index++) {
        const block = blocks[index] as { y: Span }
        top = Math.min(top, block.y.start)
        bottom = Math.max(bottom, block.y.end)
      }
      high += bottom - top
    })
    for (const b of breaks) high += 2 * CLEARANCE + lanes(crossings[b - 1] ?? 0)
    if (breaks.length > 0)
      wide += 2 * (CLEARANCE + Math.max(...breaks.map((b) => lanes(crossings[b - 1] ?? 0))))
    const score = Math.abs(Math.log(wide / high / aspect))
    if (score < best.score - 1e-9) best = { score, breaks }
  }
  if (best.breaks.length === 0) {
    restore()
    return
  }

  const cuts = best.breaks.map((b) => (gaps[b - 1] as { at: number }).at)
  const halves = best.breaks.map((b) => (gaps[b - 1] as { half: number }).half)
  const firsts = [0, ...best.breaks]

  // Every polyline cut into the strips it passes through.
  const pieces = new Map<ElkEdgeSection, Piece[]>()
  const passes = new Map<ElkEdgeSection, Crossing[]>()
  const atCut: Crossing[][] = cuts.map(() => [])
  for (const edge of edges) {
    for (const section of edge.sections ?? []) {
      const points = polyline(section)
      const first = points[0] as Point
      const list: Piece[] = [{ zone: zoneOf(first.x, cuts), points: [{ ...first }] }]
      const seen: Crossing[] = []
      for (let index = 1; index < points.length; index++) {
        const a = points[index - 1] as Point
        const b = points[index] as Point
        let zone = zoneOf(a.x, cuts)
        const target = zoneOf(b.x, cuts)
        while (zone !== target) {
          const forward = target > zone
          const cut = forward ? zone : zone - 1
          const x = cuts[cut] as number
          // Orthogonal routing crosses a vertical line only on a horizontal run.
          const y = b.x === a.x ? a.y : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)
          ;(list[list.length - 1] as Piece).points.push({ x, y })
          const next = forward ? zone + 1 : zone - 1
          list.push({ zone: next, points: [{ x, y }] })
          const crossing = { cut, forward, before: y, after: y, lane: 0 }
          seen.push(crossing)
          ;(atCut[cut] as Crossing[]).push(crossing)
          zone = next
        }
        ;(list[list.length - 1] as Piece).points.push({ ...b })
      }
      // ELK's route inside a gap was steering toward where the far end used to be; past a cut
      // it only makes the row taller, so the edge leaves the row level with where it left its block.
      list.forEach((piece, index) => {
        const entered = seen[index - 1]
        const leaving = seen[index]
        if (entered) {
          piece.points = trimHead(
            piece.points,
            cuts[entered.cut] as number,
            halves[entered.cut] as number,
          )
          entered.after = (piece.points[0] as Point).y
        }
        if (leaving) {
          piece.points = trimTail(
            piece.points,
            cuts[leaving.cut] as number,
            halves[leaving.cut] as number,
          )
          leaving.before = (piece.points[piece.points.length - 1] as Point).y
        }
      })
      pieces.set(section, list)
      passes.set(section, seen)
    }
  }

  // Row geometry. The first row stays where it was; each later one starts where its content
  // starts, and the lanes that bring an edge in sit to the left of every row.
  const start = (blocks[0] as { x: Span }).x.start
  const margin = Math.max(
    ...cuts.map((_, cut) => (halves[cut] as number) + lanes(atCut[cut]?.length ?? 0)),
  )
  const left = start + margin
  // A row keeps the heights it had in the whole picture, so it can inherit a band only an edge
  // crosses; each such band shrinks to what its edges need.
  const solids = firsts.map((): Span[] => [])
  for (const child of children) {
    const box = extent(child)
    solids[zoneOf(box.x.start, cuts)]?.push(box.y)
  }
  for (const label of labels) {
    const box = labelExtent(label)
    solids[zoneOf((box.x.start + box.x.end) / 2, cuts)]?.push(box.y)
  }
  const lines = firsts.map((): number[] => [])
  for (const list of pieces.values()) {
    for (const piece of list) for (const point of piece.points) lines[piece.zone]?.push(point.y)
  }
  const ceiling = Math.min(...solids.flat().map((span) => span.start), ...lines.flat())
  const squeeze = firsts.map((_, zone) => squeezer(solids[zone] as Span[], lines[zone] as number[]))
  const dx: number[] = []
  const dy: number[] = []
  const rowBottom: number[] = []
  firsts.forEach((first, row) => {
    const map = squeeze[row] as (y: number) => number
    const ys = [
      ...(solids[row] as Span[]).flatMap((span) => [map(span.start), map(span.end)]),
      ...(lines[row] as number[]).map(map),
    ]
    const top = Math.min(...ys)
    const placed =
      row === 0
        ? ceiling
        : (rowBottom[row - 1] as number) + 2 * CLEARANCE + lanes(atCut[row - 1]?.length ?? 0)
    dy.push(placed - top)
    dx.push(left - (blocks[first] as { x: Span }).x.start)
    rowBottom.push(placed + Math.max(...ys) - top)
  })
  const lift = (y: number, zone: number) =>
    (squeeze[zone] as (y: number) => number)(y) + (dy[zone] as number)
  const move = (point: Point, zone: number) => ({
    x: point.x + (dx[zone] as number),
    y: lift(point.y, zone),
  })

  // The lowest crossing on a row's right end takes the innermost lane and the top of the gap
  // below, so two wrapped edges leave a row without crossing each other.
  atCut.forEach((list, cut) => {
    const right = (crossing: Crossing) => (crossing.forward ? crossing.before : crossing.after)
    list.sort((a, b) => right(b) - right(a))
    list.forEach((crossing, lane) => {
      crossing.lane = lane
    })
  })

  for (const [section, list] of pieces) {
    const seen = passes.get(section) ?? []
    const out: Point[] = []
    list.forEach((piece, index) => {
      if (index > 0) {
        const crossing = seen[index - 1] as Crossing
        const cut = crossing.cut
        const total = atCut[cut]?.length ?? 1
        const rightX = (cuts[cut] as number) + (dx[cut] as number) + crossing.lane * LANE
        const leftX = left - (halves[cut] as number) - (total - 1 - crossing.lane) * LANE
        const gapY = (rowBottom[cut] as number) + CLEARANCE + crossing.lane * LANE
        const from = out[out.length - 1] as Point
        const into = move(piece.points[0] as Point, piece.zone)
        const [firstX, secondX] = crossing.forward ? [rightX, leftX] : [leftX, rightX]
        out.push(
          { x: firstX, y: from.y },
          { x: firstX, y: gapY },
          { x: secondX, y: gapY },
          { x: secondX, y: into.y },
        )
      }
      for (const point of piece.points) out.push(move(point, piece.zone))
    })
    const clean = simplify(out)
    section.startPoint = clean[0] as Point
    section.endPoint = clean[clean.length - 1] as Point
    section.bendPoints = clean.slice(1, -1)
    const junctions = (section as { junctionPoints?: Point[] }).junctionPoints
    if (junctions) {
      ;(section as { junctionPoints?: Point[] }).junctionPoints = junctions.map((point) =>
        move(point, zoneOf(point.x, cuts)),
      )
    }
  }

  for (const child of children) {
    const zone = zoneOf(extent(child).x.start, cuts)
    child.x = (child.x ?? 0) + (dx[zone] as number)
    child.y = lift(child.y ?? 0, zone)
  }
  for (const label of labels) {
    const zone = zoneOf((label.x ?? 0) + (label.width ?? 0) / 2, cuts)
    label.x = (label.x ?? 0) + (dx[zone] as number)
    label.y = lift(label.y ?? 0, zone)
  }
  const after = bounds(children, edges)

  // Everything above the holder holds only it, so each grows by what the fold added.
  for (const node of path) {
    node.width = (node.width ?? 0) + after.x - before.x
    node.height = (node.height ?? 0) + after.y - before.y
  }
  restore()
}

/** Break indices that split `count` blocks into `rows` runs with the narrowest widest run. */
function balance(
  count: number,
  rows: number,
  width: (first: number, last: number) => number,
): number[] {
  // cost[k][j]: the widest run when blocks 0..j go into k+1 runs.
  const cost: number[][] = []
  const from: number[][] = []
  for (let k = 0; k < rows; k++) {
    cost.push(Array(count).fill(Number.POSITIVE_INFINITY))
    from.push(Array(count).fill(0))
    for (let j = k; j < count; j++) {
      if (k === 0) {
        ;(cost[0] as number[])[j] = width(0, j)
        continue
      }
      for (let i = k; i <= j; i++) {
        const value = Math.max((cost[k - 1] as number[])[i - 1] as number, width(i, j))
        if (value < ((cost[k] as number[])[j] as number)) {
          ;(cost[k] as number[])[j] = value
          ;(from[k] as number[])[j] = i
        }
      }
    }
  }
  const breaks: number[] = []
  for (let k = rows - 1, j = count - 1; k > 0; k--) {
    const i = (from[k] as number[])[j] as number
    breaks.unshift(i)
    j = i - 1
  }
  return breaks
}

function bounds(children: ElkNode[], edges: ElkExtendedEdge[]): Point {
  let x = Number.NEGATIVE_INFINITY
  let y = Number.NEGATIVE_INFINITY
  for (const child of children) {
    const box = extent(child)
    x = Math.max(x, box.x.end)
    y = Math.max(y, box.y.end)
  }
  for (const edge of edges) {
    for (const point of sectionPoints(edge)) {
      x = Math.max(x, point.x)
      y = Math.max(y, point.y)
    }
    for (const label of edge.labels ?? []) {
      const box = labelExtent(label)
      x = Math.max(x, box.x.end)
      y = Math.max(y, box.y.end)
    }
  }
  return { x, y }
}

/**
 * A monotone map of heights that shrinks every band holding no box to what the edges in it need.
 * Monotone, so an orthogonal route stays orthogonal and crosses nothing it did not cross before.
 */
function squeezer(solids: Span[], lines: number[]): (y: number) => number {
  const merged: Span[] = []
  for (const span of [...solids].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1]
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end)
    else merged.push({ ...span })
  }
  const first = merged[0]
  if (!first) return (y) => y
  const ys = [...new Set(lines.map((y) => Math.round(y * 100) / 100))].sort((a, b) => a - b)
  // x is the height before, y the height after.
  const anchors: Point[] = ys
    .filter((y) => y < first.start)
    .reverse()
    .map((y, index) => ({ x: y, y: Math.max(y, first.start - CLEARANCE - index * LANE) }))
    .reverse()
  let shift = 0
  merged.forEach((span, index) => {
    anchors.push({ x: span.start, y: span.start + shift }, { x: span.end, y: span.end + shift })
    const next = merged[index + 1]
    const inside = ys.filter((y) => y > span.end && (!next || y < next.start))
    let offset = 0
    inside.forEach((y, lane) => {
      offset = Math.min(y - span.end, CLEARANCE + lane * LANE)
      anchors.push({ x: y, y: span.end + shift + offset })
    })
    if (next) {
      const gap = next.start - span.end
      shift += Math.min(gap, Math.max(2 * CLEARANCE, inside.length ? offset + CLEARANCE : 0)) - gap
    }
  })
  return (y) => {
    const after = anchors.findIndex((anchor) => anchor.x >= y)
    const low = anchors[after - 1]
    const high = anchors[after]
    if (!high) {
      const last = anchors[anchors.length - 1] as Point
      return y + last.y - last.x
    }
    if (!low || high.x === low.x) return y + high.y - high.x
    return low.y + ((high.y - low.y) * (y - low.x)) / (high.x - low.x)
  }
}

/** Where a piece that starts on a cut first leaves the gap, entered level with that point. */
function trimHead(points: Point[], cut: number, half: number): Point[] {
  const inGap = (point: Point) => Math.abs(point.x - cut) < half - 0.01
  let last = 0
  while (last < points.length - 1 && inGap(points[last + 1] as Point)) last++
  const outside = points[last + 1]
  if (!outside) return points
  const side = outside.x < cut ? cut - half : cut + half
  return [
    { x: (points[0] as Point).x, y: outside.y },
    { x: side, y: outside.y },
    ...points.slice(last + 1),
  ]
}

/** The same at the other end: the piece runs straight from where it enters the gap to the cut. */
function trimTail(points: Point[], cut: number, half: number): Point[] {
  const inGap = (point: Point) => Math.abs(point.x - cut) < half - 0.01
  let first = points.length - 1
  while (first > 0 && inGap(points[first - 1] as Point)) first--
  const outside = points[first - 1]
  if (!outside) return points
  const side = outside.x < cut ? cut - half : cut + half
  const end = points[points.length - 1] as Point
  return [...points.slice(0, first), { x: side, y: outside.y }, { x: end.x, y: outside.y }]
}

/** Drops repeated points and the middle of three in a line, so a lane of width zero leaves no stub. */
function simplify(points: Point[]): Point[] {
  const out: Point[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.x - point.x) < 0.01 && Math.abs(last.y - point.y) < 0.01) continue
    const before = out[out.length - 2]
    if (
      last &&
      before &&
      ((Math.abs(before.x - last.x) < 0.01 && Math.abs(last.x - point.x) < 0.01) ||
        (Math.abs(before.y - last.y) < 0.01 && Math.abs(last.y - point.y) < 0.01))
    ) {
      out[out.length - 1] = point
      continue
    }
    out.push(point)
  }
  return out
}
