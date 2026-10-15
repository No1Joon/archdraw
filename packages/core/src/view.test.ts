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
    expect(html).toContain('\\u003csvg')
  })
})
