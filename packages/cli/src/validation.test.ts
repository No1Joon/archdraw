import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const cli = fileURLToPath(new URL('../dist/cli.mjs', import.meta.url))
function check(source: string, args: string[] = []) {
  const result = spawnSync(process.execPath, [cli, '-', '--check', '--json', ...args], {
    input: source,
    encoding: 'utf8',
    timeout: 10_000,
  })
  expect(result.error).toBeUndefined()
  expect(result.stderr).toBe('')
  return { status: result.status, report: JSON.parse(result.stdout) }
}

describe('machine-readable validation', () => {
  it('reports success without human warnings or a render', () => {
    const result = check('nodes: [{id: api, label: "literal \\\\n"}]')
    expect(result).toEqual({ status: 0, report: { version: 1, valid: true, errors: [] } })
  })

  it('locates a misspelled icon inside a nested group and suggests a correction', () => {
    const { status, report } = check('groups: [{id: g, children: [{id: api, type: lambdaa}]}]')
    expect(status).toBe(1)
    expect(report).toMatchObject({
      version: 1,
      valid: false,
      errors: [
        {
          code: 'unknown-type',
          severity: 'error',
          path: ['groups', 0, 'children', 0, 'type'],
          elements: [{ kind: 'node', id: 'api' }],
          suggestions: expect.arrayContaining(['lambda']),
          hint: expect.stringContaining('Did you mean'),
        },
      ],
    })
  })

  it.each([
    [
      'schema',
      'nodes: [{id: api, status: invalid}]',
      'invalid-schema',
      ['nodes', 0, 'status'],
      'api',
    ],
    ['duplicate', 'nodes: [{id: api}, {id: api}]', 'duplicate-node', ['nodes', 1, 'id'], 'api'],
    [
      'parent',
      'nodes: [{id: api, parent: missing}]',
      'unknown-parent',
      ['nodes', 0, 'parent'],
      'api',
    ],
    ['cycle', 'nodes: [{id: api, parent: api}]', 'parent-cycle', ['nodes', 0, 'parent'], 'api'],
    [
      'endpoint',
      'nodes: [{id: api}]\nedges: [{from: api, to: missing}]',
      'unknown-node',
      ['edges', 0, 'to'],
      'api->missing',
    ],
    [
      'port',
      'groups: [{id: g}]\nnodes: [{id: api}]\nedges: [{id: link, from: api, to: g, toPort: missing}]',
      'unknown-port',
      ['edges', 0, 'toPort'],
      'link',
    ],
    [
      'scenario',
      'nodes: [{id: api, when: [missing]}]',
      'unknown-scenario',
      ['nodes', 0, 'when', 0],
      'api',
    ],
  ])('returns an actionable %s error', (_name, source, code, path, id) => {
    const { status, report } = check(source as string)
    expect(status).toBe(1)
    expect(report.valid).toBe(false)
    expect(report.errors).toHaveLength(1)
    expect(report.errors[0]).toMatchObject({
      code,
      path,
      severity: 'error',
      elements: [{ id }],
      hint: expect.any(String),
    })
  })

  it('reports malformed YAML with a line and column', () => {
    const { status, report } = check('nodes: [\n')
    expect(status).toBe(1)
    expect(report.errors[0]).toMatchObject({
      code: 'parse-error',
      line: expect.any(Number),
      column: expect.any(Number),
    })
  })

  it('keeps the owning group id when a nested port fails schema validation', () => {
    const { report } = check('groups: [{id: group, ports: [{id: port, side: invalid}]}]')
    expect(report.errors[0]).toMatchObject({
      code: 'invalid-schema',
      path: ['groups', 0, 'ports', 0, 'side'],
      elements: [{ kind: 'node', id: 'group' }],
    })
  })

  it('locates an entry-level schema error without treating scenario ids as node ids', () => {
    expect(check('nodes: [{id: api, unknown: true}]').report.errors[0].elements).toEqual([
      { kind: 'node', id: 'api' },
    ])
    expect(check('scenarios: [{id: scene, unknown: true}]').report.errors[0].elements).toEqual([])
  })

  it('reports invalid view options in JSON', () => {
    expect(check('nodes: [{id: api}]', ['--focus']).report.errors[0].code).toBe('scenario-required')
  })

  it('rejects a render request before writing any output', () => {
    const { status, report } = check('nodes: [{id: api}]', ['-o', join('/missing', 'output.svg')])
    expect(status).toBe(1)
    expect(report.errors[0].code).toBe('invalid-options')
  })

  it('keeps file read failures machine-readable', () => {
    const result = spawnSync(
      process.execPath,
      [cli, '/archdraw-file-that-does-not-exist.yaml', '--check', '--json'],
      { encoding: 'utf8' },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toBe('')
    expect(JSON.parse(result.stdout).errors[0].code).toBe('io-error')
  })
})
