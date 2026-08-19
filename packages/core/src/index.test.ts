import { describe, expect, it } from 'vitest'
import { createResolver, type IconPack } from './icons.js'
import { parse as parseYaml, renderToSvg } from './index.js'
import { DiagramError, normalize } from './normalize.js'

const pack: IconPack = {
  provider: 'test',
  icons: {
    'elastic-container-service': {
      viewBox: '0 0 48 48',
      content: '<rect width="48" height="48"/>',
    },
    'relational-database-service': {
      viewBox: '0 0 48 48',
      content: '<circle cx="24" cy="24" r="24"/>',
    },
  },
  aliases: { ecs: 'elastic-container-service', rds: 'relational-database-service' },
}

const nested = `
provider: test
title: Example
groups:
  - id: vpc
    label: Production VPC
    kind: vpc
    children:
      - { id: api, type: ecs, label: API }
      - { id: db, type: rds, label: Database }
edges:
  - { from: api, to: db, label: SQL }
`

const flat = `
provider: test
title: Example
nodes:
  - { id: vpc, kind: vpc, label: Production VPC }
  - { id: api, type: ecs, label: API, parent: vpc }
  - { id: db, type: rds, label: Database, parent: vpc }
edges:
  - { from: api, to: db, label: SQL }
`

describe('normalize', () => {
  it('produces the same IR for the nested and flat forms', async () => {
    const { parse } = await import('./index.js')
    expect(normalize(parse(nested))).toEqual(normalize(parse(flat)))
  })

  it('lets a container carry a type for its header icon', () => {
    expect(() => normalize({ nodes: [{ id: 'a', kind: 'vpc', type: 'ecs' }] })).not.toThrow()
  })

  it('rejects an edge pointing at a node that does not exist', () => {
    expect(() =>
      normalize({ nodes: [{ id: 'a', type: 'ecs' }], edges: [{ from: 'a', to: 'ghost' }] }),
    ).toThrow(/unknown node 'ghost'/)
  })

  it('rejects duplicate ids', () => {
    expect(() =>
      normalize({
        nodes: [
          { id: 'a', type: 'ecs' },
          { id: 'a', type: 'rds' },
        ],
      }),
    ).toThrow(/Duplicate id/)
  })
})

describe('icon resolver', () => {
  it('resolves aliases to canonical slugs', () => {
    expect(createResolver(pack).resolve('ecs').viewBox).toBe('0 0 48 48')
  })

  it('errors with near-miss suggestions instead of substituting an icon', () => {
    expect(() => createResolver(pack).resolve('ecss')).toThrow(/Did you mean: ecs/)
  })

  it('names the loaded pack when nothing comes close', () => {
    expect(() => createResolver(pack).resolve('bigquery')).toThrow(
      /Not in the loaded icon pack: test/,
    )
  })

  it('says so when no pack is registered at all', () => {
    expect(() => createResolver().resolve('ecs')).toThrow(/No icon pack registered/)
  })
})

const crossing = `
provider: test
nodes:
  - { id: vpc, kind: vpc, label: Production VPC }
  - { id: api, type: ecs, label: API, parent: vpc }
  - { id: cdn, type: ecs, label: CDN }
edges:
  - { from: cdn, to: api }
`

describe('layout', () => {
  it('hangs an edge off the lowest container holding both endpoints', async () => {
    const { layout, parse } = await import('./index.js')
    const root = await layout(normalize(parse(nested)))
    const vpc = root.children?.find((child) => child.id === 'vpc')

    expect(root.edges ?? []).toHaveLength(0)
    expect(vpc?.edges?.map((edge) => edge.id)).toEqual(['e0'])
  })

  it('keeps an edge that crosses a group boundary on the root', async () => {
    const { layout, parse } = await import('./index.js')
    const root = await layout(normalize(parse(crossing)))
    const vpc = root.children?.find((child) => child.id === 'vpc')

    expect(root.edges?.map((edge) => edge.id)).toEqual(['e0'])
    expect(vpc?.edges ?? []).toHaveLength(0)
  })
})

const labelled = (label: string) => ({
  provider: 'test',
  nodes: [
    { id: 'a', type: 'ecs', label },
    { id: 'b', type: 'rds', label },
  ],
})

describe('label sizing', () => {
  it('reserves more room for full-width labels than latin ones of equal length', async () => {
    const { layout } = await import('./index.js')
    // Equal character count, different script.
    const latin = await layout(normalize(labelled('abcdefg')))
    const hangul = await layout(normalize(labelled('가나다라마바사')))

    expect(hangul.width ?? 0).toBeGreaterThan(latin.width ?? 0)
  })
})

const untyped = `
provider: test
nodes:
  - { id: api, type: ecs, label: API }
  - { id: atlas, label: MongoDB Atlas }
edges:
  - { from: api, to: atlas }
`

describe('nodes without a type', () => {
  it('are allowed — not every component has a vendor icon', () => {
    expect(() => normalize(parseYaml(untyped))).not.toThrow()
  })

  it('still rejects a misspelled key rather than treating it as untyped', () => {
    expect(() => normalize({ nodes: [{ id: 'a', typ: 'ecs' }] })).toThrow(/Unrecognized key/)
  })

  it('renders as a labelled box, and a typed one keeps its icon', async () => {
    const svg = await renderToSvg(untyped, { icons: pack })
    expect(svg).toContain('MongoDB Atlas')
    // The icon body only comes from the typed node.
    expect(svg.match(/<rect width="48" height="48"\/>/g) ?? []).toHaveLength(1)
  })
})

const badged = `
provider: test
nodes:
  - id: box
    kind: instance
    type: ecs
    label: host
    children:
      - { id: proc, label: process }
`

describe('container icons', () => {
  it('draws the container icon once, beside its label', async () => {
    const svg = await renderToSvg(badged, { icons: pack })
    expect(svg).toContain('host')
    expect(svg.match(/<rect width="48" height="48"\/>/g) ?? []).toHaveLength(1)
  })
})

describe('multi-line labels', () => {
  it('splits on newlines and reserves room for the extra lines', async () => {
    const { layout } = await import('./index.js')
    const one = await layout(normalize({ nodes: [{ id: 'a', type: 'ecs', label: 'name' }] }))
    const three = await layout(
      normalize({ nodes: [{ id: 'a', type: 'ecs', label: 'name\n(id)\n(url)' }] }),
    )

    expect(three.height ?? 0).toBeGreaterThan(one.height ?? 0)
  })

  it('renders each line as its own tspan', async () => {
    const svg = await renderToSvg(
      { provider: 'test', nodes: [{ id: 'a', type: 'ecs', label: 'name\n(id)' }] },
      { icons: pack },
    )
    expect((svg.match(/<tspan/g) ?? []).length).toBe(2)
  })
})

describe('toJsonSchema', () => {
  it('carries the same field set the zod schema enforces', async () => {
    const { toJsonSchema } = await import('./index.js')
    const schema = toJsonSchema() as {
      properties: Record<string, { enum?: string[] }>
    }

    expect(Object.keys(schema.properties).sort()).toEqual([
      'direction',
      'edges',
      'groups',
      'nodes',
      'provider',
      'title',
    ])
    expect(schema.properties.direction?.enum).toEqual(['RIGHT', 'DOWN'])
  })
})

describe('renderToSvg', () => {
  it('renders a stable SVG', async () => {
    const svg = await renderToSvg(nested, { icons: pack })
    expect(svg).toMatchSnapshot()
  })
})
