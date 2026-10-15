import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import { describe, expect, it } from 'vitest'
import { layout, normalize, renderToSvg, selectView } from './index.js'

function nodes(root: ElkNode): Map<string, ElkNode> {
  return new Map(
    (root.children ?? []).flatMap((node) => [[node.id, node] as const, ...nodes(node)]),
  )
}
function edges(root: ElkNode): ElkExtendedEdge[] {
  return [...((root.edges ?? []) as ElkExtendedEdge[]), ...(root.children ?? []).flatMap(edges)]
}
const routed = {
  direction: 'RIGHT',
  groups: [
    {
      id: 'project',
      direction: 'DOWN',
      ports: [{ id: 'ssh', side: 'WEST' }],
      children: [{ id: 'api' }, { id: 'db' }],
    },
  ],
  nodes: [{ id: 'monitor' }, { id: 'sink' }],
  edges: [
    { id: 'ssh', from: 'monitor', to: 'project', toPort: 'ssh', label: 'SSH' },
    { id: 'entry', from: 'project', fromPort: 'ssh', to: 'api', label: 'Forward' },
    { id: 'store', from: 'api', to: 'db' },
    { id: 'query', from: 'db', to: 'sink', label: 'Result' },
  ],
}

describe('group routing', () => {
  it('validates group-only fields and named port references', () => {
    expect(() => normalize({ nodes: [{ id: 'a', direction: 'DOWN' }] })).toThrow('group-only')
    expect(() =>
      normalize({
        groups: [
          {
            id: 'a',
            ports: [
              { id: 'in', side: 'WEST' },
              { id: 'in', side: 'EAST' },
            ],
          },
        ],
      }),
    ).toThrow('Duplicate port')
    expect(() =>
      normalize({ ...routed, edges: [{ from: 'monitor', to: 'project', toPort: 'typo' }] }),
    ).toThrow("unknown port 'typo'")
  })
  it('lays out a group vertically inside a horizontal graph and keeps all routes', async () => {
    const ir = normalize(routed)
    const root = await layout(ir)
    const byId = nodes(root)
    expect(byId.get('db')?.y).toBeGreaterThan(byId.get('api')?.y ?? 0)
    expect(byId.get('db')?.x).toBe(byId.get('api')?.x)
    expect(edges(root)).toHaveLength(4)
    expect(edges(root).every((edge) => edge.sections?.length)).toBe(true)
    const project = byId.get('project')
    const port = project?.ports?.find((port) => port.id === 'project>port:ssh')
    expect(port?.x).toBeCloseTo(0)
    const ssh = edges(root).find((edge) => edge.id === 'e0')
    expect(ssh?.sections?.[0]?.endPoint.x).toBe((project?.x ?? 0) + (port?.x ?? 0))
    expect(ssh?.sections?.[0]?.endPoint.y).toBe((project?.y ?? 0) + (port?.y ?? 0))
    const svg = await renderToSvg(routed)
    expect(svg).toContain('data-port-id="ssh"')
    expect(svg).toContain('>Forward</text>')
  })
  it('supports ports on all sides, unused ports and collapsed groups', async () => {
    for (const side of ['NORTH', 'EAST', 'SOUTH', 'WEST']) {
      const input = {
        ...routed,
        groups: [
          {
            ...routed.groups[0],
            ports: [
              { id: 'ssh', side },
              { id: 'unused', side: 'EAST' },
            ],
          },
        ],
      }
      const root = await layout(normalize(input))
      const group = nodes(root).get('project')
      const port = group?.ports?.find((entry) => entry.id.endsWith('port:ssh'))
      if (side === 'NORTH') expect(port?.y).toBeCloseTo(0)
      if (side === 'SOUTH') expect(port?.y).toBe(group?.height)
      if (side === 'WEST') expect(port?.x).toBeCloseTo(0)
      if (side === 'EAST') expect(port?.x).toBe(group?.width)
      const compact = await layout(selectView(normalize(input), { collapsed: ['project'] }))
      expect(edges(compact)).toHaveLength(2)
    }
  })
  it('inherits local directions and permits a nested override with cross-boundary edges', async () => {
    const input = {
      groups: [
        {
          id: 'outer',
          direction: 'DOWN',
          children: [
            { id: 'one' },
            { id: 'inner', direction: 'RIGHT', children: [{ id: 'two' }, { id: 'three' }] },
          ],
        },
      ],
      nodes: [{ id: 'client' }],
      edges: [
        { from: 'client', to: 'two' },
        { from: 'one', to: 'two' },
        { from: 'two', to: 'three' },
      ],
    }
    for (const wrap of [false, true]) {
      const root = await layout(normalize({ ...input, wrap }))
      const byId = nodes(root)
      expect(byId.get('three')?.x).toBeGreaterThan(byId.get('two')?.x ?? 0)
      expect(edges(root)).toHaveLength(3)
      expect(edges(root).every((edge) => edge.sections?.length)).toBe(true)
    }
  })
})

it('keeps explicitly directed groups intact when the root wrap would otherwise descend into them', async () => {
  const input = {
    groups: [
      {
        id: 'project',
        direction: 'RIGHT',
        children: Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` })),
      },
    ],
    edges: Array.from({ length: 11 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` })),
  }
  const plain = nodes(await layout(normalize(input))).get('project')
  const wrapped = nodes(await layout(normalize({ ...input, wrap: true }))).get('project')
  expect(wrapped?.width).toBe(plain?.width)
  expect(wrapped?.height).toBe(plain?.height)
})
