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
  LINE_HEIGHT,
  labelLines,
  labelWidth,
  NODE_LABEL_SIZE,
  TITLE_BAND,
  TITLE_SIZE,
} from './layout.js'
import type { FlatNode, Ir } from './normalize.js'

export interface Theme {
  background: string
  groupStroke: string
  groupFill: string
  boxFill: string
  boxStroke: string
  text: string
  mutedText: string
  edge: string
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
  fontFamily: defaultTheme.fontFamily,
}

export interface DiagramProps {
  root: ElkNode
  ir: Ir
  icons: IconResolver
  theme?: Theme
}

export function Diagram({ root, ir, icons, theme = defaultTheme }: DiagramProps) {
  const byId = new Map(ir.nodes.map((node) => [node.id, node]))
  // The title sits above the graph rather than inside it, so ELK's box is left untouched.
  const band = ir.title ? TITLE_BAND : 0
  const width = Math.max(root.width ?? 0, ir.title ? labelWidth(ir.title, TITLE_SIZE) + 48 : 0)
  const height = (root.height ?? 0) + band

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
      <defs>
        <marker
          id="archdraw-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          // Fixed px — stroke multiples let the head outgrow a short final segment.
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={theme.edge} />
        </marker>
      </defs>
      <rect width={width} height={height} fill={theme.background} />
      {ir.title ? (
        <text x={24} y={TITLE_SIZE + 14} fill={theme.text} fontSize={TITLE_SIZE} fontWeight={600}>
          {ir.title}
        </text>
      ) : null}
      <g transform={`translate(0, ${band})`}>
        <Container node={root} byId={byId} icons={icons} theme={theme} ir={ir} />
      </g>
    </svg>
  )
}

interface ContainerProps {
  node: ElkNode
  byId: Map<string, FlatNode>
  icons: IconResolver
  theme: Theme
  ir: Ir
}

function Container({ node, byId, icons, theme, ir }: ContainerProps) {
  return (
    <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}>
      {node.children?.map((child) => {
        const meta = byId.get(child.id)
        if (meta?.isGroup) {
          const badge = meta.type ? icons.resolve(meta.type) : undefined
          return (
            <g key={child.id} transform={`translate(${child.x ?? 0}, ${child.y ?? 0})`}>
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
              <Container
                node={{ ...child, x: 0, y: 0 }}
                byId={byId}
                icons={icons}
                theme={theme}
                ir={ir}
              />
            </g>
          )
        }
        return meta ? (
          <Node key={child.id} node={child} meta={meta} icons={icons} theme={theme} />
        ) : null
      })}
      {/* Edges paint after the children; a group fill would cover them otherwise. */}
      {(node.edges as ElkExtendedEdge[] | undefined)?.map((edge) => (
        <EdgePath key={edge.id} edge={edge} ir={ir} theme={theme} />
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
      <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}>
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
      </g>
    )
  }

  // No icon: draw the label in a box so third parties read as components, not as blanks.
  if (!asset) {
    return (
      <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}>
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
      </g>
    )
  }

  const top = meta.domain ? DOMAIN_BAND : 0
  const mark = height - top
  return (
    <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}>
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

function EdgePath({ edge, ir, theme }: { edge: ElkExtendedEdge; ir: Ir; theme: Theme }) {
  const section = edge.sections?.[0]
  if (!section) return null

  // ELK's routed path, bends included — that route is what keeps edges off the icons.
  const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const index = Number(edge.id.slice(1))
  const meta = ir.edges[index]
  const label = edge.labels?.[0]

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={theme.edge}
        strokeWidth={1.5}
        strokeDasharray={meta?.style === 'dashed' ? '5 4' : undefined}
        markerEnd="url(#archdraw-arrow)"
      />
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
    </g>
  )
}
