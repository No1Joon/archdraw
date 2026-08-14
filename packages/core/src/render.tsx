import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import type { IconResolver } from './icons.js'
import { EDGE_LABEL_SIZE, GROUP_HEADER, LABEL_BAND, NODE_LABEL_SIZE } from './layout.js'
import type { FlatNode, Ir } from './normalize.js'

export interface Theme {
  background: string
  groupStroke: string
  groupFill: string
  text: string
  mutedText: string
  edge: string
  fontFamily: string
}

export const defaultTheme: Theme = {
  background: '#ffffff',
  groupStroke: '#8c9bab',
  groupFill: '#f6f8fa',
  text: '#12181f',
  mutedText: '#5b6675',
  edge: '#5b6675',
  // resvg resolves only the first family. Noto ships under both names.
  fontFamily: "'Noto Sans KR', 'Noto Sans CJK KR', ui-sans-serif, -apple-system, sans-serif",
}

export interface DiagramProps {
  root: ElkNode
  ir: Ir
  icons: IconResolver
  theme?: Theme
}

export function Diagram({ root, ir, icons, theme = defaultTheme }: DiagramProps) {
  const byId = new Map(ir.nodes.map((node) => [node.id, node]))
  const width = root.width ?? 0
  const height = root.height ?? 0

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
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={theme.edge} />
        </marker>
      </defs>
      <rect width={width} height={height} fill={theme.background} />
      <Container node={root} byId={byId} icons={icons} theme={theme} ir={ir} />
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
              <text
                x={16}
                y={GROUP_HEADER - 8}
                fill={theme.mutedText}
                fontSize={13}
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

  return (
    <g transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}>
      {asset ? (
        <svg
          x={0}
          y={0}
          width={width}
          height={height}
          viewBox={asset.viewBox}
          // Vendored SVG from the sync script, never user input.
          dangerouslySetInnerHTML={{ __html: asset.content }}
        />
      ) : null}
      <text
        x={width / 2}
        y={height + LABEL_BAND - 6}
        textAnchor="middle"
        fill={theme.text}
        fontSize={NODE_LABEL_SIZE}
        fontWeight={500}
      >
        {meta.label}
      </text>
    </g>
  )
}

function EdgePath({ edge, ir, theme }: { edge: ElkExtendedEdge; ir: Ir; theme: Theme }) {
  const section = edge.sections?.[0]
  if (!section) return null

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
