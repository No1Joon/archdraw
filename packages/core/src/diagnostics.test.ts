import type { ElkEdgeSection, ElkNode } from 'elkjs'
import { describe, expect, it } from 'vitest'
import { diagnose, layout, normalize } from './index.js'

type Point = { x: number; y: number }
const section = (points: [Point, Point, ...Point[]]): ElkEdgeSection => ({
  id: 's',
  startPoint: points[0],
  endPoint: points[points.length - 1] as Point,
  bendPoints: points.slice(1, -1),
})

describe('quality diagnostics', () => {
  it('returns a versioned clean report for a simple layout', async () => {
    const ir = normalize({
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ from: 'a', to: 'b', label: 'get' }],
    })
    const report = diagnose(ir, await layout(ir))
    expect(report.version).toBe(1)
    expect(report.summary).toEqual({ warning: 0, info: 0 })
    expect(report.textMeasurement).toBe('estimated')
  })
  it('reports clipped and overlapping labels with stable element ids and geometry', () => {
    const ir = normalize({
      nodes: [
        { id: 'a', label: 'A long label that does not fit' },
        { id: 'b', label: 'B' },
      ],
    })
    const root: ElkNode = {
      id: 'root',
      width: 100,
      height: 60,
      children: [
        { id: 'a', x: 0, y: 0, width: 30, height: 40 },
        { id: 'b', x: 20, y: 0, width: 30, height: 40 },
      ],
    }
    const first = diagnose(ir, root),
      second = diagnose(ir, root)
    expect(
      first.diagnostics.some(
        (entry) => entry.code === 'label-clipped' && entry.elements[0]?.id === 'a',
      ),
    ).toBe(true)
    expect(first.diagnostics.some((entry) => entry.code === 'label-overlap')).toBe(true)
    expect(first.diagnostics.every((entry) => entry.bounds && entry.hint)).toBe(true)
    expect(first).toEqual(second)
  })
  it('counts a crossing once and resolves nested edge coordinates', () => {
    const ir = normalize({
      groups: [{ id: 'g', children: [{ id: 'a' }, { id: 'b' }] }],
      nodes: [{ id: 'c' }, { id: 'd' }],
      edges: [
        { id: 'horizontal', from: 'a', to: 'b' },
        { id: 'vertical', from: 'c', to: 'd' },
      ],
    })
    const root: ElkNode = {
      id: 'root',
      width: 400,
      height: 400,
      children: [
        {
          id: 'g',
          x: 100,
          y: 50,
          width: 200,
          height: 220,
          children: [],
          edges: [
            {
              id: 'e0',
              sources: ['a'],
              targets: ['b'],
              sections: [
                section([
                  { x: 20, y: 100 },
                  { x: 180, y: 100 },
                ]),
              ],
            },
          ],
        },
      ],
      edges: [
        {
          id: 'e1',
          sources: ['c'],
          targets: ['d'],
          sections: [
            section([
              { x: 200, y: 80 },
              { x: 200, y: 220 },
            ]),
          ],
        },
      ],
    }
    const crossings = diagnose(ir, root).diagnostics.filter(
      (entry) => entry.code === 'edge-crossing',
    )
    expect(crossings).toHaveLength(1)
    expect(crossings[0]?.point).toEqual({ x: 200, y: 150 })
    expect(crossings[0]?.elements.map((element) => element.id).sort()).toEqual([
      'horizontal',
      'vertical',
    ])
    const touching = structuredClone(root)
    if (touching.edges?.[0]?.sections?.[0])
      touching.edges[0].sections[0].startPoint = { x: 200, y: 150 }
    expect(
      diagnose(ir, touching).diagnostics.filter((entry) => entry.code === 'edge-crossing'),
    ).toHaveLength(0)
  })
  it('separates explicitly declared reverse responses from layout warnings', () => {
    const input = {
      nodes: [{ id: 'a' }, { id: 'b' }],
      edges: [{ id: 'reply', from: 'a', to: 'b', role: 'response' }],
    }
    const root: ElkNode = {
      id: 'root',
      width: 350,
      height: 250,
      children: [
        { id: 'a', x: 200, y: 30, width: 64, height: 40 },
        { id: 'b', x: 0, y: 30, width: 64, height: 40 },
      ],
      edges: [
        {
          id: 'e0',
          sources: ['a'],
          targets: ['b'],
          sections: [
            section([
              { x: 200, y: 50 },
              { x: 280, y: 50 },
              { x: 280, y: 200 },
              { x: 64, y: 200 },
              { x: 64, y: 50 },
            ]),
          ],
        },
      ],
    }
    const response = diagnose(normalize(input), root).diagnostics.find(
      (entry) => entry.code === 'response-route',
    )
    expect(response?.severity).toBe('info')
    expect(response?.elements).toEqual([{ kind: 'edge', id: 'reply' }])
    const request = diagnose(
      normalize({ ...input, edges: [{ ...input.edges[0], role: 'request' }] }),
      root,
    )
    expect(request.diagnostics.find((entry) => entry.code === 'edge-detour')?.severity).toBe(
      'warning',
    )
  })
})

it('reports lines crossing group titles as label overlap', () => {
  const ir = normalize({
    groups: [{ id: 'g', label: 'Group title' }],
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ id: 'through-title', from: 'a', to: 'b' }],
  })
  const root: ElkNode = {
    id: 'root',
    width: 300,
    height: 200,
    children: [{ id: 'g', x: 100, y: 50, width: 150, height: 100 }],
    edges: [
      {
        id: 'e0',
        sources: ['a'],
        targets: ['b'],
        sections: [
          section([
            { x: 130, y: 0 },
            { x: 130, y: 180 },
          ]),
        ],
      },
    ],
  }
  expect(diagnose(ir, root).diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'label-overlap',
        elements: [
          { kind: 'node', id: 'g' },
          { kind: 'edge', id: 'through-title' },
        ],
      }),
    ]),
  )
})
