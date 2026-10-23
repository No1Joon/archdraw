import { describe, expect, it } from 'vitest'
import { renderToSvg, renderToSvgFrames, type SvgFrame } from './index.js'

describe('SVG animation frames', () => {
  const diagram = {
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [{ from: 'a', to: 'b' }],
  }

  it('lays out once and samples a complete flow cycle without duplicating its endpoint', async () => {
    let layouts = 0
    const frames: SvgFrame[] = []
    for await (const frame of renderToSvgFrames(diagram, { onLayout: () => layouts++ }))
      frames.push(frame)
    expect(layouts).toBe(1)
    expect(frames).toHaveLength(24)
    expect(frames.reduce((total, frame) => total + frame.delay, 0)).toBe(1200)
    expect(frames[0]?.svg).toContain('stroke-dashoffset:0}')
    expect(frames[12]?.svg).toContain('stroke-dashoffset:-15}')
    expect(frames[23]?.svg).toContain('stroke-dashoffset:-28.75}')
    expect(frames.every((frame) => !frame.svg.includes('@keyframes'))).toBe(true)
    expect(frames.every((frame) => frame.svg.includes('class="archdraw-flow"'))).toBe(true)
    expect(await renderToSvg(diagram)).not.toContain('class="archdraw-flow"')
  })

  it('keeps inactive flows hidden and honours explicit and status-based animation settings', async () => {
    const frames = renderToSvgFrames(
      {
        scenarios: [{ id: 'normal' }, { id: 'failure' }],
        nodes: diagram.nodes,
        edges: [
          { id: 'active', from: 'a', to: 'b' },
          { id: 'off', from: 'a', to: 'b', animation: 'none' },
          { id: 'planned', from: 'a', to: 'b', status: 'planned' },
          { id: 'blocked', from: 'a', to: 'b', status: 'blocked' },
          { id: 'forced', from: 'a', to: 'b', status: 'planned', animation: 'flow' },
          { id: 'failure-only', from: 'a', to: 'b', when: ['failure'] },
        ],
      },
      { scenario: 'normal' },
    )
    const { value: frame } = await frames.next()
    expect(frame?.svg.match(/class="archdraw-flow"/g)).toHaveLength(3)
    expect(frame?.svg).toContain(
      '[data-edge-id="failure-only"] .archdraw-flow{animation:none;opacity:0}',
    )
    await frames.return(undefined)
  })

  it('uses the same selected view as static output and validates before yielding', async () => {
    const source = {
      scenarios: [{ id: 'normal' }],
      nodes: [{ id: 'group' }, { id: 'a', parent: 'group' }, { id: 'b', parent: 'group' }],
      edges: diagram.edges,
    }
    const frames = renderToSvgFrames(source, {
      scenario: 'normal',
      focus: true,
      collapsed: ['group'],
    })
    const { value: frame } = await frames.next()
    expect(frame?.svg).toContain('data-node-id="group"')
    expect(frame?.svg).not.toContain('data-node-id="a"')
    await frames.return(undefined)
    await expect(renderToSvgFrames(source, { scenario: 'unknown' }).next()).rejects.toThrow(
      'Unknown scenario',
    )
    await expect(
      renderToSvgFrames({ nodes: [{ id: 'a', type: 'unknown' }] }).next(),
    ).rejects.toThrow('Unknown type')
  })
})
