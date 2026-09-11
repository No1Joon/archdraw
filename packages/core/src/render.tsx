import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import type { IconResolver } from './icons.js'
import {
  CARD_ICON,
  CARD_PADDING,
  DOMAIN_BAND,
  DOMAIN_SIZE,
  EDGE_LABEL_SIZE,
  GROUP_HEADER,
  GROUP_ICON,
  GROUP_LABEL_INSET,
  GROUP_LABEL_SIZE,
  LABEL_BAND,
  LEGEND_BAND,
  LEGEND_SIZE,
  LINE_HEIGHT,
  labelLines,
  labelWidth,
  NODE_LABEL_SIZE,
  STATUS_BADGE,
  TITLE_BAND,
  TITLE_SIZE,
} from './layout.js'
import type { FlatNode, Ir } from './normalize.js'
import type { Edge, Status } from './schema.js'

export interface Theme {
  background: string
  groupStroke: string
  groupFill: string
  boxFill: string
  boxStroke: string
  text: string
  mutedText: string
  edge: string
  /** The travelling dashes in an animated render. Falls back to colours that read on both grounds. */
  flow?: string
  /** Traffic arriving from outside the system, and traffic leaving it. */
  flowIn?: string
  flowOut?: string
  /** How much of a node or an edge is built. Falls back to colours that read on both grounds. */
  statusPlanned?: string
  statusInProgress?: string
  statusBlocked?: string
  statusDone?: string
  fontFamily: string
}

export const defaultTheme: Theme = {
  background: '#ffffff',
  groupStroke: '#8c9bab',
  groupFill: '#f6f8fa',
  boxFill: '#ffffff',
  boxStroke: '#c7ced6',
  text: '#12181f',
  mutedText: '#5b6675',
  edge: '#5b6675',
  flow: '#1f6feb',
  flowIn: '#1a7f37',
  flowOut: '#bc4c00',
  statusPlanned: '#8c959f',
  statusInProgress: '#9a6700',
  statusBlocked: '#cf222e',
  statusDone: '#1a7f37',
  // resvg resolves only the first family. Noto ships under both names.
  fontFamily: "'Noto Sans KR', 'Noto Sans CJK KR', ui-sans-serif, -apple-system, sans-serif",
}

/** The same palette read against a dark page, so a diagram is not a white slab in dark mode. */
export const darkTheme: Theme = {
  background: '#0d1117',
  groupStroke: '#6b7683',
  groupFill: '#161b22',
  boxFill: '#161b22',
  boxStroke: '#30363d',
  text: '#e6edf3',
  mutedText: '#9198a1',
  edge: '#9198a1',
  flow: '#58a6ff',
  flowIn: '#3fb950',
  flowOut: '#db6d28',
  statusPlanned: '#8b949e',
  statusInProgress: '#d29922',
  statusBlocked: '#f85149',
  statusDone: '#3fb950',
  fontFamily: defaultTheme.fontFamily,
}

/** Used when a caller's own theme predates the flow colours. */
const FLOW = { flow: '#1f6feb', flowIn: '#1a7f37', flowOut: '#bc4c00' }

/** The three flows, in the order a legend reads them. */
export const FLOW_KEYS = [
  ['flowIn', 'from outside'],
  ['flow', 'inside'],
  ['flowOut', 'to outside'],
] as const satisfies readonly (readonly [keyof Theme, string])[]

/**
 * Which side of the boundary the traffic crosses. An edge with both ends on the same side —
 * two internal services, or two things that are both outside — stays the plain colour.
 */
export function flowColour(theme: Theme, from?: FlatNode, to?: FlatNode): string {
  if (from?.external && !to?.external) return theme.flowIn ?? FLOW.flowIn
  if (!from?.external && to?.external) return theme.flowOut ?? FLOW.flowOut
  return theme.flow ?? FLOW.flow
}

/** Used when a caller's own theme predates the status colours. */
const STATUS = {
  planned: '#8c959f',
  in_progress: '#9a6700',
  blocked: '#cf222e',
  done: '#1a7f37',
} as const satisfies Record<Status, string>

/** The four states, in the order a legend reads them: not started, moving, stuck, finished. */
export const STATUS_KEYS = [
  ['planned', 'planned'],
  ['in_progress', 'in progress'],
  ['blocked', 'blocked'],
  ['done', 'done'],
] as const satisfies readonly (readonly [Status, string])[]

const STATUS_THEME_KEY = {
  planned: 'statusPlanned',
  in_progress: 'statusInProgress',
  blocked: 'statusBlocked',
  done: 'statusDone',
} as const satisfies Record<Status, keyof Theme>

export function statusColour(theme: Theme, status: Status): string {
  return theme[STATUS_THEME_KEY[status]] ?? STATUS[status]
}

/**
 * A line that is already there is just a line; one that is not says so in its own colour, so a
 * planned connection does not read as built in a picture printed without its legend.
 */
function edgeColour(theme: Theme, status?: Status): string {
  return status && status !== 'done' ? statusColour(theme, status) : theme.edge
}

/** An arrowhead has to match the line it ends, so a coloured edge needs a marker of its own. */
const MARKED: readonly Status[] = ['planned', 'in_progress', 'blocked']

function markerId(status?: Status): string {
  return status && status !== 'done' ? `archdraw-arrow-${status}` : 'archdraw-arrow'
}

/** Motion claims traffic, so a connection that is not built stays still unless the file says otherwise. */
function animates(meta?: Edge): boolean {
  if (meta?.animation) return meta.animation === 'flow'
  return meta?.status !== 'planned' && meta?.status !== 'blocked'
}

const LEGEND_GAP = 20

function legendWidth(statuses: readonly (readonly [Status, string])[]): number {
  return statuses.reduce(
    (sum, [, text]) => sum + STATUS_BADGE * 2 + 6 + labelWidth(text, LEGEND_SIZE) + LEGEND_GAP,
    -LEGEND_GAP,
  )
}

/** Sparse dots, not a dashed line: the drawn edge must still read as the solid or dashed one it is. */
function flowCss(): string {
  return [
    // One period per 1.2s is 25 px/s, the same speed on a short edge and a long one alike.
    '.archdraw-flow{stroke-width:4;stroke-linecap:round;stroke-dasharray:2 28;',
    'animation:archdraw-flow 1.2s linear infinite}',
    '@keyframes archdraw-flow{to{stroke-dashoffset:-30}}',
    '@media (prefers-reduced-motion:reduce){.archdraw-flow{animation:none;opacity:0}}',
  ].join('')
}

/** Absent from the scene reads as faded; failed in it reads as drained of colour. */
function sceneCss(): string {
  return [
    '.archdraw-off{opacity:.12}',
    '.archdraw-off .archdraw-flow{animation:none;opacity:0}',
    '.archdraw-down{filter:grayscale(1);opacity:.45}',
  ].join('')
}

export interface DiagramProps {
  root: ElkNode
  ir: Ir
  icons: IconResolver
  theme?: Theme
  /** Draw travelling dashes along every edge. Off by default: a still SVG must stay byte-identical. */
  flow?: boolean
}

export function Diagram({ root, ir, icons, theme = defaultTheme, flow }: DiagramProps) {
  const byId = new Map(ir.nodes.map((node) => [node.id, node]))
  // Only the page can hold a state, so the marks ride with the animation and never reach a
  // still SVG — that one shows every element, whatever the diagram says about scenes.
  const scenes = flow === true && ir.scenarios.length > 0
  // Only what the diagram actually uses: a legend naming states nothing is in explains nothing.
  const statuses = STATUS_KEYS.filter(
    ([status]) =>
      ir.nodes.some((node) => node.status === status) ||
      ir.edges.some((edge) => edge.status === status),
  )
  const arrows = MARKED.filter((status) => ir.edges.some((edge) => edge.status === status))
  // The title sits above the graph rather than inside it, so ELK's box is left untouched.
  const band = ir.title ? TITLE_BAND : 0
  const width = Math.max(
    root.width ?? 0,
    ir.title ? labelWidth(ir.title, TITLE_SIZE) + 48 : 0,
    statuses.length ? legendWidth(statuses) + 48 : 0,
  )
  const height = (root.height ?? 0) + band + (statuses.length ? LEGEND_BAND : 0)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ir.title ?? 'architecture diagram'}
      style={{ fontFamily: theme.fontFamily }}
    >
      <title>{ir.title ?? 'architecture diagram'}</title>
      {flow ? <style>{flowCss()}</style> : null}
      {scenes ? <style>{sceneCss()}</style> : null}
      <defs>
        <Arrow id="archdraw-arrow" fill={theme.edge} />
        {arrows.map((status) => (
          <Arrow key={status} id={markerId(status)} fill={statusColour(theme, status)} />
        ))}
      </defs>
      <rect width={width} height={height} fill={theme.background} />
      {ir.title ? (
        <text x={24} y={TITLE_SIZE + 14} fill={theme.text} fontSize={TITLE_SIZE} fontWeight={600}>
          {ir.title}
        </text>
      ) : null}
      <g transform={`translate(0, ${band})`}>
        <Container
          node={root}
          byId={byId}
          icons={icons}
          theme={theme}
          ir={ir}
          flow={flow}
          scenes={scenes}
        />
      </g>
      {statuses.length ? (
        <Legend statuses={statuses} theme={theme} y={height - LEGEND_BAND / 2} />
      ) : null}
    </svg>
  )
}

/** One arrowhead per colour in use: a marker paints itself, not the line that calls it. */
function Arrow({ id, fill }: { id: string; fill: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      // Fixed px — stroke multiples let the head outgrow a short final segment.
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill={fill} />
    </marker>
  )
}

/**
 * A ring for what has not started, a half disc for what is moving, a bar for what is stuck, a
 * tick for what is done: the shape says it as well as the colour does, and the legend says it
 * in words. A picture read in one colour, or printed in grey, still carries all four.
 */
function StatusBadge({
  x,
  y,
  status,
  theme,
}: {
  x: number
  y: number
  status: Status
  theme: Theme
}) {
  const colour = statusColour(theme, status)
  const ground = theme.background
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* The ground disc is what lets a badge sit over an icon without reading into it. */}
      <circle r={STATUS_BADGE} fill={ground} />
      <circle
        r={STATUS_BADGE - 1.5}
        fill={status === 'planned' ? 'none' : colour}
        stroke={colour}
        strokeWidth={2}
      />
      {status === 'in_progress' ? (
        <path d="M 0 -6.5 A 6.5 6.5 0 0 0 0 6.5 Z" fill={ground} />
      ) : null}
      {status === 'blocked' ? (
        <rect x={-4} y={-1.5} width={8} height={3} rx={1.5} fill={ground} />
      ) : null}
      {status === 'done' ? (
        <path
          d="M -3.4 0.2 L -1.2 2.6 L 3.6 -2.8"
          fill="none"
          stroke={ground}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </g>
  )
}

/** Drawn into the SVG rather than around it, so a PNG dropped in a document carries it too. */
function Legend({
  statuses,
  theme,
  y,
}: {
  statuses: readonly (readonly [Status, string])[]
  theme: Theme
  y: number
}) {
  let cursor = 24
  const rows = statuses.map(([status, text]) => {
    const x = cursor
    cursor += STATUS_BADGE * 2 + 6 + labelWidth(text, LEGEND_SIZE) + LEGEND_GAP
    return { status, text, x }
  })
  return (
    <g>
      {rows.map(({ status, text, x }) => (
        <g key={status}>
          <StatusBadge x={x + STATUS_BADGE} y={y} status={status} theme={theme} />
          <text
            x={x + STATUS_BADGE * 2 + 6}
            y={y + LEGEND_SIZE / 2 - 1}
            fill={theme.mutedText}
            fontSize={LEGEND_SIZE}
          >
            {text}
          </text>
        </g>
      ))}
    </g>
  )
}

interface ContainerProps {
  node: ElkNode
  byId: Map<string, FlatNode>
  icons: IconResolver
  theme: Theme
  ir: Ir
  flow?: boolean
  scenes?: boolean
}

/** What a caller outside the SVG finds an element by: its name, never its position. */
function nodeMarks(meta: FlatNode): { 'data-node-id': string; 'data-status'?: string } {
  return { 'data-node-id': meta.id, ...(meta.status ? { 'data-status': meta.status } : {}) }
}

/** The page reads these back; a list it does not name means "in every scene". */
function sceneMarks(
  scenes: boolean | undefined,
  when?: string[],
  down?: string[],
): { 'data-when'?: string; 'data-down'?: string } {
  if (!scenes) return {}
  return {
    ...(when ? { 'data-when': when.join(' ') } : {}),
    ...(down ? { 'data-down': down.join(' ') } : {}),
  }
}

function Container({ node, byId, icons, theme, ir, flow, scenes }: ContainerProps) {
  return (
    <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}>
      {node.children?.map((child) => {
        const meta = byId.get(child.id)
        if (meta?.isGroup) {
          const badge = meta.type ? icons.resolve(meta.type) : undefined
          return (
            <g
              key={child.id}
              transform={`translate(${child.x ?? 0}, ${child.y ?? 0})`}
              {...nodeMarks(meta)}
              {...sceneMarks(scenes, meta.when, meta.down)}
            >
              {/* A 6 4 dash. Dashed edges are round dots so a boundary never reads as an edge. */}
              <rect
                width={child.width ?? 0}
                height={child.height ?? 0}
                rx={10}
                fill={theme.groupFill}
                stroke={theme.groupStroke}
                strokeWidth={1}
                strokeDasharray="6 4"
              />
              {badge ? (
                <svg
                  x={GROUP_LABEL_INSET}
                  y={(GROUP_HEADER - GROUP_ICON) / 2}
                  width={GROUP_ICON}
                  height={GROUP_ICON}
                  viewBox={badge.viewBox}
                  // Vendored SVG from the sync script, never user input.
                  dangerouslySetInnerHTML={{ __html: badge.content }}
                />
              ) : null}
              <text
                x={GROUP_LABEL_INSET + (badge ? GROUP_ICON + 8 : 0)}
                y={GROUP_HEADER - 8}
                fill={theme.mutedText}
                fontSize={GROUP_LABEL_SIZE}
                fontWeight={600}
              >
                {meta.label}
              </text>
              {/* In the header, so it reads as the group's own: a VM that exists deploys nothing. */}
              {meta.status ? (
                <StatusBadge
                  x={(child.width ?? 0) - GROUP_LABEL_INSET}
                  y={GROUP_HEADER / 2}
                  status={meta.status}
                  theme={theme}
                />
              ) : null}
              <Container
                node={{ ...child, x: 0, y: 0 }}
                byId={byId}
                icons={icons}
                theme={theme}
                ir={ir}
                flow={flow}
                scenes={scenes}
              />
            </g>
          )
        }
        if (!meta) return null
        // A wrapper only where there is something to toggle, so every other picture keeps the
        // markup it had — the still SVG and its snapshots included.
        return scenes && (meta.when || meta.down) ? (
          <g key={child.id} {...sceneMarks(scenes, meta.when, meta.down)}>
            <Node node={child} meta={meta} icons={icons} theme={theme} />
          </g>
        ) : (
          <Node key={child.id} node={child} meta={meta} icons={icons} theme={theme} />
        )
      })}
      {/* Edges paint after the children; a group fill would cover them otherwise. */}
      {(node.edges as ElkExtendedEdge[] | undefined)?.map((edge) => (
        <EdgePath
          key={edge.id}
          edge={edge}
          ir={ir}
          byId={byId}
          theme={theme}
          flow={flow}
          scenes={scenes}
        />
      ))}
    </g>
  )
}

function Node({
  node,
  meta,
  icons,
  theme,
}: {
  node: ElkNode
  meta: FlatNode
  icons: IconResolver
  theme: Theme
}) {
  const width = node.width ?? 0
  const height = node.height ?? 0
  const asset = meta.type ? icons.resolve(meta.type) : undefined

  if (asset && meta.shape === 'card') {
    const lines = labelLines(meta.label)
    const top = height / 2 - ((lines.length - 1) * LINE_HEIGHT) / 2 + 4
    return (
      <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`} {...nodeMarks(meta)}>
        <rect
          width={width}
          height={height}
          rx={6}
          fill={theme.boxFill}
          stroke={theme.boxStroke}
          strokeWidth={1}
        />
        <svg
          x={CARD_PADDING}
          y={(height - CARD_ICON) / 2}
          width={CARD_ICON}
          height={CARD_ICON}
          viewBox={asset.viewBox}
          // Vendored SVG from the sync script, never user input.
          dangerouslySetInnerHTML={{ __html: asset.content }}
        />
        <text
          x={CARD_PADDING * 2 + CARD_ICON}
          y={top}
          fill={theme.text}
          fontSize={NODE_LABEL_SIZE}
          fontWeight={500}
        >
          {lines.map((line, index) => (
            <tspan key={line} x={CARD_PADDING * 2 + CARD_ICON} dy={index === 0 ? 0 : LINE_HEIGHT}>
              {line}
            </tspan>
          ))}
        </text>
        {meta.status ? <StatusBadge x={width} y={0} status={meta.status} theme={theme} /> : null}
      </g>
    )
  }

  // No icon: draw the label in a box so third parties read as components, not as blanks.
  if (!asset) {
    return (
      <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`} {...nodeMarks(meta)}>
        <rect
          width={width}
          height={height}
          rx={6}
          fill={theme.boxFill}
          stroke={theme.boxStroke}
          strokeWidth={1}
        />
        <Label
          x={width / 2}
          y={height / 2 + 4 - ((labelLines(meta.label).length - 1) * LINE_HEIGHT) / 2}
          text={meta.label}
          fill={theme.text}
          size={NODE_LABEL_SIZE}
        />
        {meta.status ? <StatusBadge x={width} y={0} status={meta.status} theme={theme} /> : null}
      </g>
    )
  }

  const top = meta.domain ? DOMAIN_BAND : 0
  const mark = height - top
  return (
    <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`} {...nodeMarks(meta)}>
      {meta.domain ? (
        <text
          x={width / 2}
          y={DOMAIN_SIZE}
          textAnchor="middle"
          fill={theme.mutedText}
          fontSize={DOMAIN_SIZE}
        >
          {meta.domain}
        </text>
      ) : null}
      <svg
        x={(width - mark) / 2}
        y={top}
        width={mark}
        height={mark}
        viewBox={asset.viewBox}
        // Vendored SVG from the sync script, never user input.
        dangerouslySetInnerHTML={{ __html: asset.content }}
      />
      <Label
        x={width / 2}
        y={height + LABEL_BAND - 6}
        text={meta.label}
        fill={theme.text}
        size={NODE_LABEL_SIZE}
      />
      {/* The mark's corner, not the cell's: an icon node is wider than its icon when it
          carries a domain. */}
      {meta.status ? (
        <StatusBadge x={(width + mark) / 2} y={top} status={meta.status} theme={theme} />
      ) : null}
    </g>
  )
}

/** Lines after the first sit below, the way reference architectures carry an id under a name. */
function Label({
  x,
  y,
  text,
  fill,
  size,
}: {
  x: number
  y: number
  text: string
  fill: string
  size: number
}) {
  const lines = labelLines(text)
  return (
    <text x={x} y={y} textAnchor="middle" fill={fill} fontSize={size} fontWeight={500}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : LINE_HEIGHT}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

function EdgePath({
  edge,
  ir,
  byId,
  theme,
  flow,
  scenes,
}: {
  edge: ElkExtendedEdge
  ir: Ir
  byId: Map<string, FlatNode>
  theme: Theme
  flow?: boolean
  scenes?: boolean
}) {
  const section = edge.sections?.[0]
  if (!section) return null

  // ELK's routed path, bends included — that route is what keeps edges off the icons.
  const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const index = Number(edge.id.slice(1))
  const meta = ir.edges[index]
  const label = edge.labels?.[0]

  // Beside its label where it has one, so the mark and the words read as one statement.
  const mark =
    meta?.status &&
    (meta.label && label
      ? { x: (label.x ?? 0) - STATUS_BADGE - 4, y: (label.y ?? 0) + (label.height ?? 0) / 2 }
      : midpoint(points))

  return (
    <g
      data-edge-id={meta?.id}
      {...(meta?.status ? { 'data-status': meta.status } : {})}
      {...sceneMarks(scenes, meta?.when)}
    >
      <path
        d={d}
        fill="none"
        stroke={edgeColour(theme, meta?.status)}
        // Faint for a line that is not there yet. On the element, not the stroke, so the
        // arrowhead fades with it. `blocked` keeps full weight: it is a thing to look at.
        opacity={meta?.status === 'planned' ? 0.55 : undefined}
        strokeWidth={1.5}
        strokeDasharray={meta?.style === 'dashed' ? '1 5' : undefined}
        strokeLinecap={meta?.style === 'dashed' ? 'round' : undefined}
        markerEnd={`url(#${markerId(meta?.status)})`}
      />
      {/* A second path over the first: the line stays where it was and only the dashes travel. */}
      {flow && animates(meta) ? (
        <path
          className="archdraw-flow"
          d={d}
          fill="none"
          stroke={flowColour(theme, byId.get(meta?.from ?? ''), byId.get(meta?.to ?? ''))}
        />
      ) : null}
      {meta?.label && label ? (
        <text
          x={(label.x ?? 0) + (label.width ?? 0) / 2}
          y={(label.y ?? 0) + EDGE_LABEL_SIZE}
          textAnchor="middle"
          fill={theme.mutedText}
          fontSize={EDGE_LABEL_SIZE}
        >
          {meta.label}
        </text>
      ) : null}
      {meta?.status && mark ? (
        <StatusBadge x={mark.x} y={mark.y} status={meta.status} theme={theme} />
      ) : null}
    </g>
  )
}

interface Point {
  x: number
  y: number
}

/** Half way along the route, not half way between the ends — a bent edge would put the mark off it. */
function midpoint(points: Point[]): Point {
  const last = points[points.length - 1] ?? { x: 0, y: 0 }
  const leg = (a: Point, b: Point) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (a && b) total += leg(a, b)
  }
  let run = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    const length = leg(a, b)
    if (run + length >= total / 2) {
      const t = length === 0 ? 0 : (total / 2 - run) / length
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    run += length
  }
  return last
}
