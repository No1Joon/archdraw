import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import {
  CARD_ICON,
  CARD_PADDING,
  DOMAIN_SIZE,
  detours,
  EDGE_LABEL_SIZE,
  GROUP_HEADER,
  GROUP_ICON,
  GROUP_LABEL_INSET,
  GROUP_LABEL_SIZE,
  headerTail,
  LABEL_BAND,
  LINE_HEIGHT,
  labelLines,
  labelWidth,
  NODE_LABEL_SIZE,
} from './layout.js'
import type { Ir } from './normalize.js'

export interface Point {
  x: number
  y: number
}
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}
export interface ElementRef {
  kind: 'node' | 'edge'
  id: string
}
export interface Diagnostic {
  id: string
  code: 'edge-detour' | 'response-route' | 'label-overlap' | 'label-clipped' | 'edge-crossing'
  severity: 'warning' | 'info'
  elements: ElementRef[]
  message: string
  hint: string
  bounds?: Bounds
  point?: Point
  ratio?: number
  cause?: 'backward' | 'boundary' | 'wrap' | 'layout'
}
export interface QualityReport {
  version: 1
  /** Coordinates are relative to the layout graph, before the title and status legend bands. */
  coordinateSpace: 'layout'
  textMeasurement: 'estimated'
  canvas: { width: number; height: number }
  summary: { warning: number; info: number }
  diagnostics: Diagnostic[]
}

interface Label {
  element: ElementRef
  bounds: Bounds
  container: Bounds
}
interface Segment {
  element: ElementRef
  from: string
  to: string
  a: Point
  b: Point
  first: boolean
  last: boolean
}
const EPSILON = 0.1
const overlaps = (a: Bounds, b: Bounds) =>
  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > EPSILON &&
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > EPSILON
const contains = (a: Bounds, b: Bounds) =>
  b.x >= a.x - EPSILON &&
  b.y >= a.y - EPSILON &&
  b.x + b.width <= a.x + a.width + EPSILON &&
  b.y + b.height <= a.y + a.height + EPSILON
const same = (a: Point, b: Point) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON

/** Proper crossings exclude shared endpoints and collinear rails. */
function intersection(a: Segment, b: Segment): Point | undefined {
  const ax = a.b.x - a.a.x,
    ay = a.b.y - a.a.y
  const bx = b.b.x - b.a.x,
    by = b.b.y - b.a.y
  const cross = ax * by - ay * bx
  if (Math.abs(cross) < EPSILON) return
  const dx = b.a.x - a.a.x,
    dy = b.a.y - a.a.y
  const t = (dx * by - dy * bx) / cross,
    u = (dx * ay - dy * ax) / cross
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return
  const point = { x: a.a.x + t * ax, y: a.a.y + t * ay }
  const end = (segment: Segment) =>
    (segment.first && same(point, segment.a)) || (segment.last && same(point, segment.b))
  if (end(a) || end(b)) return
  return point
}

function crossesLabel(segment: Segment, bounds: Bounds): boolean {
  const left = bounds.x + 1,
    right = bounds.x + bounds.width - 1
  const top = bounds.y + 1,
    bottom = bounds.y + bounds.height - 1
  if (left >= right || top >= bottom) return false
  const dx = segment.b.x - segment.a.x,
    dy = segment.b.y - segment.a.y
  let start = 0,
    end = 1
  const tests = [
    [-dx, segment.a.x - left],
    [dx, right - segment.a.x],
    [-dy, segment.a.y - top],
    [dy, bottom - segment.a.y],
  ]
  for (const [p = 0, q = 0] of tests) {
    if (Math.abs(p) < 1e-9) {
      if (q < 0) return false
      continue
    }
    const ratio = q / p
    if (p < 0) start = Math.max(start, ratio)
    else end = Math.min(end, ratio)
    if (start > end) return false
  }
  return end - start > 1e-9
}

/** Inspect an already laid-out graph; estimates use the same font metrics as layout. */
export function diagnose(ir: Ir, root: ElkNode): QualityReport {
  const diagnostics: Diagnostic[] = []
  const byId = new Map(ir.nodes.map((node) => [node.id, node]))
  const canvas = { width: root.width ?? 0, height: root.height ?? 0 }
  const frame: Bounds = { x: 0, y: 0, ...canvas }
  const labels: Label[] = []
  const segments: Segment[] = []
  const boxes: { element: ElementRef; bounds: Bounds }[] = []
  const add = (diagnostic: Omit<Diagnostic, 'id'>) => {
    const key = diagnostic.elements
      .map((element) => `${element.kind}:${element.id}`)
      .sort()
      .join(':')
    const at = diagnostic.point
      ? `:${diagnostic.point.x.toFixed(1)},${diagnostic.point.y.toFixed(1)}`
      : ''
    const base = `${diagnostic.code}:${key}${at}`
    let id = base
    for (let n = 2; diagnostics.some((entry) => entry.id === id); n++) id = `${base}:${n}`
    diagnostics.push({ id, ...diagnostic })
  }
  const text = (
    element: ElementRef,
    value: string,
    x: number,
    baseline: number,
    size: number,
    container: Bounds,
    centered = false,
  ) => {
    const width = labelWidth(value, size)
    labels.push({
      element,
      container,
      bounds: {
        x: x - (centered ? width / 2 : 0),
        y: baseline - size,
        width,
        height: size + (labelLines(value).length - 1) * LINE_HEIGHT,
      },
    })
  }
  const walk = (node: ElkNode, ox = 0, oy = 0, container = frame) => {
    for (const child of node.children ?? []) {
      const meta = byId.get(child.id)
      if (!meta) continue
      const x = ox + (child.x ?? 0),
        y = oy + (child.y ?? 0)
      const width = child.width ?? 0,
        height = child.height ?? 0
      const bounds = { x, y, width, height }
      const element: ElementRef = { kind: 'node', id: meta.id }
      boxes.push({ element, bounds })
      if (meta.isGroup) {
        const header = { ...bounds, height: GROUP_HEADER, width: width - headerTail(meta) }
        text(
          element,
          meta.label,
          x + GROUP_LABEL_INSET + (child.labels?.[0]?.x ?? 0) + (meta.type ? GROUP_ICON + 8 : 0),
          y + GROUP_HEADER - 8,
          GROUP_LABEL_SIZE,
          header,
        )
        walk(child, x, y, bounds)
      } else {
        const lines = labelLines(meta.label).length
        if (meta.type && meta.shape === 'icon') {
          text(
            element,
            meta.label,
            x + width / 2,
            y + height + LABEL_BAND - 6,
            NODE_LABEL_SIZE,
            container,
            true,
          )
          if (meta.domain)
            text(element, meta.domain, x + width / 2, y + DOMAIN_SIZE, DOMAIN_SIZE, container, true)
        } else {
          const card = meta.type && meta.shape === 'card'
          text(
            element,
            meta.label,
            card ? x + CARD_PADDING * 2 + CARD_ICON : x + width / 2,
            y + height / 2 + 4 - ((lines - 1) * LINE_HEIGHT) / 2,
            NODE_LABEL_SIZE,
            bounds,
            !card,
          )
        }
      }
    }
    for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) {
      const meta = ir.edges[Number(edge.id.slice(1))]
      if (!meta) continue
      const element: ElementRef = { kind: 'edge', id: meta.id }
      for (const label of edge.labels ?? []) {
        if (meta.label)
          text(
            element,
            meta.label,
            ox + (label.x ?? 0) + (label.width ?? 0) / 2,
            oy + (label.y ?? 0) + EDGE_LABEL_SIZE,
            EDGE_LABEL_SIZE,
            container,
            true,
          )
      }
      for (const section of edge.sections ?? []) {
        const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map(
          (point) => ({ x: ox + point.x, y: oy + point.y }),
        )
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1],
            b = points[i]
          if (a && b)
            segments.push({
              element,
              from: meta.from,
              to: meta.to,
              a,
              b,
              first: i === 1,
              last: i === points.length - 1,
            })
        }
      }
    }
  }
  walk(root)

  for (const detour of detours(ir, root)) {
    const from = byId.get(detour.from),
      to = byId.get(detour.to)
    const cause = detour.backward
      ? 'backward'
      : from?.parent !== to?.parent
        ? 'boundary'
        : ir.wrap
          ? 'wrap'
          : 'layout'
    add({
      code: detour.response ? 'response-route' : 'edge-detour',
      severity: detour.response ? 'info' : 'warning',
      elements: [{ kind: 'edge', id: detour.id }],
      ratio: detour.ratio,
      cause,
      message: `${detour.from} -> ${detour.to} travels ${detour.ratio.toFixed(1)} times the direct distance.`,
      hint: detour.response
        ? 'This edge is declared as a response; reverse travel is expected.'
        : cause === 'boundary'
          ? 'Choose a boundary port or local group direction while retaining security boundaries.'
          : cause === 'backward'
            ? 'Check the local direction; declare role: response only for a real response.'
            : cause === 'wrap'
              ? 'Keep the connected pair together in the fold or disable wrap.'
              : 'Place the connected pair closer in the node order.',
    })
  }
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i] as Label
    if (!contains(frame, label.bounds) || !contains(label.container, label.bounds)) {
      add({
        code: 'label-clipped',
        severity: 'warning',
        elements: [label.element],
        bounds: label.bounds,
        message: `Label for ${label.element.id} extends outside its canvas or container.`,
        hint: 'Shorten the label, add real line breaks, or give the containing group more room.',
      })
    }
    for (const other of labels.slice(i + 1)) {
      if (!overlaps(label.bounds, other.bounds)) continue
      add({
        code: 'label-overlap',
        severity: 'warning',
        elements: [label.element, other.element],
        bounds: label.bounds,
        message: `Labels for ${label.element.id} and ${other.element.id} overlap.`,
        hint: 'Shorten or split the labels, or change the containing group direction.',
      })
    }
    const crossed = new Set<string>()
    for (const segment of segments) {
      if (crossed.has(segment.element.id) || !crossesLabel(segment, label.bounds)) continue
      crossed.add(segment.element.id)
      add({
        code: 'label-overlap',
        severity: 'warning',
        elements: [label.element, segment.element],
        bounds: label.bounds,
        message: `Edge ${segment.element.id} crosses the label for ${label.element.id}.`,
        hint: 'Change the boundary port side, local direction or label length to clear the text.',
      })
    }
    const ancestors = new Set<string>()
    if (label.element.kind === 'node') {
      for (
        let parent = byId.get(label.element.id)?.parent;
        parent;
        parent = byId.get(parent)?.parent
      )
        ancestors.add(parent)
    }
    for (const box of boxes) {
      if (
        byId.get(box.element.id)?.isGroup ||
        (label.element.kind === 'node' &&
          (box.element.id === label.element.id || ancestors.has(box.element.id)))
      )
        continue
      if (!overlaps(label.bounds, box.bounds)) continue
      add({
        code: 'label-overlap',
        severity: 'warning',
        elements: [label.element, box.element],
        bounds: label.bounds,
        message: `Label for ${label.element.id} overlaps node ${box.element.id}.`,
        hint: 'Shorten or split the label, or change node ordering and group direction.',
      })
    }
  }
  const crossings = new Set<string>()
  for (let i = 0; i < segments.length; i++) {
    const a = segments[i] as Segment
    for (const b of segments.slice(i + 1)) {
      if (a.element.id === b.element.id) continue
      const point = intersection(a, b)
      if (!point) continue
      const pair = [a.element.id, b.element.id].sort()
      const key = `${pair.join(':')}:${point.x.toFixed(1)},${point.y.toFixed(1)}`
      if (crossings.has(key)) continue
      crossings.add(key)
      add({
        code: 'edge-crossing',
        severity: 'warning',
        elements: [a.element, b.element],
        point,
        message: `Edges ${a.element.id} and ${b.element.id} cross.`,
        hint: 'Change port sides, group direction or node ordering to separate these routes.',
      })
    }
  }
  return {
    version: 1,
    coordinateSpace: 'layout',
    textMeasurement: 'estimated',
    canvas,
    summary: {
      warning: diagnostics.filter((entry) => entry.severity === 'warning').length,
      info: diagnostics.filter((entry) => entry.severity === 'info').length,
    },
    diagnostics,
  }
}
