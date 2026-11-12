import type { ElkExtendedEdge, ElkNode } from 'elkjs'
import { describe, expect, it } from 'vitest'
import {
  DiagramError,
  layout,
  normalize,
  renderToHtml,
  renderToSvgFrames,
  selectView,
} from './index.js'
import { defaultTheme } from './render.js'
import { renderView } from './viewer.js'

function edges(root: ElkNode): ElkExtendedEdge[] {
  return [...((root.edges ?? []) as ElkExtendedEdge[]), ...(root.children ?? []).flatMap(edges)]
}

const cycle = {
  entry: 'start',
  nodes: [{ id: 'end' }, { id: 'answer' }, { id: 'check' }, { id: 'start' }],
  edges: [
    { id: 'start-check', from: 'start', to: 'check', layout: 'forward' },
    { id: 'ask', from: 'check', to: 'answer', layout: 'forward' },
    { id: 'done', from: 'check', to: 'end', layout: 'forward' },
    { id: 'retry', from: 'answer', to: 'check', layout: 'back', label: 'try again' },
  ],
}

describe('workflow layout hints', () => {
  it.each(['RIGHT', 'DOWN'] as const)(
    'retains the entry, endpoint ids and cycle in %s layout',
    async (direction) => {
      const ir = normalize({ ...cycle, direction })
      const root = await layout(ir)
      const nodes = new Map(root.children?.map((node) => [node.id, node]))
      const key = direction === 'RIGHT' ? 'x' : 'y'
      const start = nodes.get('start') as ElkNode
      expect(start[key]).toBe(Math.min(...[...nodes.values()].map((node) => node[key] ?? 0)))
      expect(
        edges(root)
          .map((edge) => edge.id)
          .sort(),
      ).toEqual(['e0', 'e1', 'e2', 'e3'])
      const back = edges(root).find((edge) => edge.id === 'e3') as ElkExtendedEdge
      expect(back.sources).toEqual(['answer'])
      expect(back.targets).toEqual(['check'])
      const s = back.sections?.[0]
      expect(s?.bendPoints?.length).toBeGreaterThanOrEqual(2)
      const rail =
        direction === 'RIGHT'
          ? Math.max(...(s?.bendPoints ?? []).map((p) => p.y))
          : Math.max(...(s?.bendPoints ?? []).map((p) => p.x))
      expect(rail).toBeGreaterThan(
        Math.max(
          ...[...nodes.values()].map((node) =>
            direction === 'RIGHT'
              ? (node.y ?? 0) + (node.height ?? 0)
              : (node.x ?? 0) + (node.width ?? 0),
          ),
        ),
      )
    },
  )

  it('routes multiple return lanes around nodes after wrapping', async () => {
    const ir = normalize({
      wrap: true,
      entry: 'n0',
      nodes: Array.from({ length: 14 }, (_, i) => ({ id: `n${i}` })),
      edges: [
        ...Array.from({ length: 13 }, (_, i) => ({
          from: `n${i}`,
          to: `n${i + 1}`,
          layout: 'forward',
        })),
        { from: 'n13', to: 'n1', layout: 'back', label: 'retry' },
        { from: 'n10', to: 'n3', layout: 'back', label: 'edit' },
      ],
    })
    const root = await layout(ir)
    expect(new Set(root.children?.map((n) => n.y)).size).toBeGreaterThan(1)
    const back = edges(root).filter((e) => ['e13', 'e14'].includes(e.id))
    expect(back).toHaveLength(2)
    const rails = back.map((e) => Math.max(...(e.sections?.[0]?.bendPoints ?? []).map((p) => p.y)))
    expect(new Set(rails).size).toBe(2)
    for (const e of back)
      for (const s of e.sections ?? []) {
        const p = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint]
        for (let i = 1; i < p.length; i++) {
          const a = p[i - 1] as { x: number; y: number },
            b = p[i] as { x: number; y: number }
          expect(a.x === b.x || a.y === b.y).toBe(true)
          for (const n of root.children ?? []) {
            const x = n.x ?? 0,
              y = n.y ?? 0,
              w = n.width ?? 0,
              h = n.height ?? 0
            const crosses =
              a.x === b.x
                ? a.x > x + 0.01 &&
                  a.x < x + w - 0.01 &&
                  Math.max(a.y, b.y) > y + 0.01 &&
                  Math.min(a.y, b.y) < y + h - 0.01
                : a.y > y + 0.01 &&
                  a.y < y + h - 0.01 &&
                  Math.max(a.x, b.x) > x + 0.01 &&
                  Math.min(a.x, b.x) < x + w - 0.01
            expect(crosses, `${e.id} crosses ${n.id}`).toBe(false)
          }
        }
      }
  })

  it('keeps named boundary ports on an expanded loop group', async () => {
    const ir = normalize({
      direction: 'RIGHT',
      entry: 'g',
      groups: [
        {
          id: 'g',
          entry: 'a',
          direction: 'DOWN',
          ports: [{ id: 'next', side: 'EAST' }],
          children: [{ id: 'a' }, { id: 'b' }],
        },
      ],
      nodes: [{ id: 'other' }],
      edges: [
        { from: 'a', to: 'b', layout: 'forward' },
        { from: 'b', to: 'a', layout: 'back', label: 'return' },
        { from: 'a', to: 'g', toPort: 'next' },
        { from: 'g', fromPort: 'next', to: 'other' },
      ],
    })
    const root = await layout(ir)
    const group = root.children?.find((node) => node.id === 'g') as ElkNode
    expect(group.ports?.find((p) => p.id === 'g>port:next')?.x).toBe(group.width)
    expect(
      edges(root)
        .map((e) => e.id)
        .sort(),
    ).toEqual(['e0', 'e1', 'e2', 'e3'])
  })

  it('preserves a self loop as an orthogonal return path', async () => {
    const root = await layout(
      normalize({
        entry: 'a',
        nodes: [{ id: 'a' }],
        edges: [{ from: 'a', to: 'a', layout: 'back' }],
      }),
    )
    const s = edges(root)[0]?.sections?.[0]
    expect(s?.startPoint).not.toEqual(s?.endPoint)
    expect(s?.bendPoints?.length).toBeGreaterThanOrEqual(2)
  })

  it.each(['WEST', 'NORTH'] as const)(
    'aligns the %s boundary hop with the entry card',
    async (side) => {
      const ir = normalize({
        entry: 'g',
        groups: [
          {
            id: 'g',
            entry: 'a',
            direction: 'DOWN',
            ports: [{ id: 'in', side }],
            children: [{ id: 'a' }, { id: 'b' }],
          },
        ],
        nodes: [{ id: 'external' }],
        edges: [
          { from: 'external', to: 'g', toPort: 'in' },
          { from: 'g', fromPort: 'in', to: 'a' },
          { from: 'a', to: 'b', layout: 'forward' },
          { from: 'b', to: 'a', layout: 'back' },
        ],
      })
      const root = await layout(ir)
      const group = root.children?.find((n) => n.id === 'g') as ElkNode
      const entry = group.children?.find((n) => n.id === 'a') as ElkNode
      const port = group.ports?.find((p) => p.id === 'g>port:in')
      const hop = edges(group).find((e) => e.id === 'e1')?.sections?.[0]
      expect(hop?.bendPoints).toEqual([])
      expect(hop?.startPoint).toEqual({ x: port?.x, y: port?.y })
      if (side === 'WEST') {
        expect(port?.x).toBe(0)
        expect(port?.y).toBe((entry.y ?? 0) + (entry.height ?? 0) / 2)
        expect(hop?.endPoint.x).toBe(entry.x)
        expect(hop?.endPoint.y).toBe(port?.y)
      } else {
        expect(port?.y).toBe(0)
        expect(port?.x).toBe((entry.x ?? 0) + (entry.width ?? 0) / 2)
        expect(hop?.endPoint.y).toBe(entry.y)
        expect(hop?.endPoint.x).toBe(port?.x)
      }
    },
  )

  it.each([
    [{ entry: 'missing', nodes: [{ id: 'a' }] }, 'invalid-entry'],
    [{ entry: 'a', groups: [{ id: 'g', children: [{ id: 'a' }] }] }, 'invalid-entry'],
    [{ nodes: [{ id: 'a', entry: 'a' }] }, 'group-only-field'],
    [
      {
        groups: [{ id: 'g', children: [{ id: 'a' }] }],
        nodes: [{ id: 'b' }],
        edges: [{ from: 'a', to: 'b', layout: 'back' }],
      },
      'invalid-back-edge',
    ],
  ])('rejects unsupported references with structured errors', (input, code) => {
    try {
      normalize(input)
      expect.fail('must reject')
    } catch (error) {
      expect(error).toBeInstanceOf(DiagramError)
      expect((error as DiagramError).issue.code).toBe(code)
    }
  })
})

describe('document animation defaults', () => {
  const input = {
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c', animation: 'flow' },
    ],
  }
  it('resolves edge overrides once for static, animated and offline views', async () => {
    const ir = normalize({ ...input, animation: 'none' })
    expect(ir.edges.map((e) => e.animation)).toEqual(['none', 'flow'])
    const html = await renderToHtml({ ...input, animation: 'none' })
    expect(html.match(/class="archdraw-flow"/g) ?? []).toHaveLength(1)
    const view = await renderView(ir, { provider: 'aws', icons: {}, aliases: {} }, defaultTheme, {})
    expect(view.match(/class="archdraw-flow"/g) ?? []).toHaveLength(1)
    const allStatic = { ...input, animation: 'none', edges: [{ from: 'a', to: 'b' }] }
    for await (const frame of renderToSvgFrames(allStatic))
      expect(frame.svg).not.toContain('class="archdraw-flow"')
  })
  it('keeps planned and blocked connections still unless the edge explicitly opts in', () => {
    const ir = normalize({
      animation: 'flow',
      nodes: [{ id: 'a' }],
      edges: [
        { from: 'a', to: 'a', status: 'planned' },
        { from: 'a', to: 'a', status: 'blocked' },
        { from: 'a', to: 'a', status: 'blocked', animation: 'flow' },
      ],
    })
    expect(ir.edges.map((e) => e.animation)).toEqual([undefined, undefined, 'flow'])
  })
  it('survives scenario focus and collapse projections', () => {
    const ir = normalize({
      animation: 'none',
      scenarios: [{ id: 'on' }],
      groups: [{ id: 'g', entry: 'a', children: [{ id: 'a' }, { id: 'b' }] }],
      nodes: [{ id: 'c' }],
      edges: [{ from: 'b', to: 'c' }],
    })
    expect(
      selectView(ir, { scenario: 'on', focus: true, collapsed: ['g'] }).edges[0]?.animation,
    ).toBe('none')
  })
})
