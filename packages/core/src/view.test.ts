import { describe, expect, it } from 'vitest'
import { normalize, renderToHtml, renderToSvg, selectView } from './index.js'

const source = {
  scenarios: [{ id: 'normal' }, { id: 'failure' }],
  nodes: [
    { id: 'app' },
    { id: 'cache', when: ['normal'], down: ['failure'] },
    { id: 'backup', when: ['failure'] },
    { id: 'group', when: ['normal'], children: [{ id: 'hidden' }] },
  ],
  edges: [
    { from: 'app', to: 'cache', when: ['normal'] },
    { from: 'app', to: 'backup' },
  ],
}

describe('scenario views', () => {
  it('keeps failed nodes, removes inactive subtrees and edges, and preserves the source', () => {
    const ir = normalize(source)
    const view = selectView(ir, { scenario: 'failure', focus: true })
    expect(view.nodes.map((node) => node.id)).toEqual(['app', 'cache', 'backup'])
    expect(view.edges.map((edge) => edge.to)).toEqual(['backup'])
    expect(ir.nodes).toHaveLength(5)
  })
  it('rejects an unknown scenario and focus without a selection', async () => {
    await expect(renderToSvg(source, { scenario: 'typo' })).rejects.toThrow('Unknown scenario')
    await expect(renderToHtml(source, { focus: true })).rejects.toThrow('Focus requires')
  })
  it('exports a selected static scenario with failed styling and stable edge ids', async () => {
    const svg = await renderToSvg(source, { scenario: 'normal', focus: true })
    expect(svg).not.toContain('data-node-id="backup"')
    expect(svg).toContain('data-edge-id="app-&gt;cache"')
    const failed = await renderToSvg(source, { scenario: 'failure', focus: true })
    expect(failed).toContain('grayscale(1)')
    expect(failed).toContain('data-node-id="cache"')
  })
  it('embeds safe offline focused variants and export controls', async () => {
    const html = await renderToHtml(source, { scenario: 'failure', focus: true })
    expect(html).toContain('id="export-png"')
    expect(html).toContain('data-initial="failure"')
    expect(html).toContain('id="focus" type="checkbox" checked')
    expect(html).toContain('ArchdrawViewer.renderView')
  })
})

describe('collapsed groups', () => {
  const grouped = {
    groups: [
      {
        id: 'project',
        collapsed: true,
        children: [{ id: 'api' }, { id: 'nested', children: [{ id: 'db' }] }],
      },
    ],
    nodes: [{ id: 'monitor' }],
    edges: [
      { id: 'external', from: 'monitor', to: 'db' },
      { from: 'api', to: 'db' },
    ],
  }
  it('keeps boundaries and external edge ids, redirects hidden endpoints, and removes internal edges', () => {
    const ir = normalize(grouped)
    const view = selectView(ir)
    expect(view.nodes.map((node) => node.id)).toEqual(['project', 'monitor'])
    expect(view.edges).toMatchObject([{ id: 'external', from: 'monitor', to: 'project' }])
    expect(view.edges).toHaveLength(1)
    expect(selectView(ir, { collapsed: [] }).nodes).toHaveLength(5)
  })
  it('supports independent nested collapse and refuses unknown groups', () => {
    const ir = normalize(grouped)
    const view = selectView(ir, { collapsed: ['nested'] })
    expect(view.nodes.map((node) => node.id)).toEqual(['project', 'api', 'nested', 'monitor'])
    expect(view.edges[0]?.to).toBe('nested')
    expect(() => selectView(ir, { collapsed: ['api'] })).toThrow('not a group')
    expect(() => normalize({ nodes: [{ id: 'leaf', collapsed: true }] })).toThrow('not a group')
  })
  it('renders a compact overview and an expandable offline page', async () => {
    const compact = await renderToSvg(grouped)
    const full = await renderToSvg(grouped, { collapsed: [] })
    expect(compact).not.toContain('data-node-id="db"')
    expect(full).toContain('data-node-id="db"')
    expect(Number(/width="([\d.]+)"/.exec(compact)?.[1])).toBeLessThan(
      Number(/width="([\d.]+)"/.exec(full)?.[1]),
    )
    const html = await renderToHtml(grouped)
    expect(html).toContain('data-group="project"')
    expect(html).toContain('Collapse all')
    expect(html).toContain('ArchdrawViewer.renderView')
  })
})

it('preserves hidden endpoint scenario conditions when edges are redirected to collapsed groups', async () => {
  const ir = normalize({
    scenarios: [{ id: 'normal' }, { id: 'failure' }],
    groups: [{ id: 'g', collapsed: true, children: [{ id: 'api', when: ['normal'] }] }],
    nodes: [{ id: 'monitor' }],
    edges: [{ from: 'monitor', to: 'api' }],
  })
  const view = selectView(ir, { scenario: 'failure' })
  expect(view.edges[0]).toMatchObject({ to: 'g', when: ['normal'] })
  expect(selectView(ir, { scenario: 'failure', focus: true }).edges).toHaveLength(0)
  await expect(
    renderToSvg(
      { scenarios: [{ id: 'normal' }], nodes: [{ id: 'invalid', type: 'missing', when: [] }] },
      { scenario: 'normal', focus: true },
    ),
  ).rejects.toThrow('Unknown type')
  expect(() => normalize({ scenarios: [{ id: 'normal' }, { id: 'normal' }] })).toThrow(
    'Duplicate scenario',
  )
})
