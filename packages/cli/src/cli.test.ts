import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.mjs')

/** Argument wiring only — the pipeline itself is covered in `@archdraw/core`. */
function run(args: string[], input?: string) {
  const result = spawnSync('node', [cli, ...args], { input: input ?? '', encoding: 'utf8' })
  return { code: result.status ?? 0, stdout: result.stdout, stderr: result.stderr }
}

// Fail loudly rather than skip: a silently skipped CLI suite reads as a passing one.
if (!existsSync(cli)) throw new Error(`${cli} is missing — run \`pnpm build\` first.`)

const diagram =
  'nodes:\n  - { id: a, type: ecs }\n  - { id: b, type: rds }\nedges: [{ from: a, to: b }]\n'

describe('archdraw types', () => {
  it('resolves an alias to its canonical slug', () => {
    const { stdout } = run(['types', 'ecs'])
    expect(stdout).toContain('ecs -> amazon-elastic-container-service')
  })

  it('honours -p on the subcommand, not the default command', () => {
    const { stdout } = run(['types', 'sql', '-p', 'gcp'])
    expect(stdout).toContain('cloud-sql')
    expect(stdout).not.toContain('amazon-')
  })

  it('fails with a hint when nothing matches', () => {
    const { code, stderr } = run(['types', 'zzzz'])
    expect(code).toBe(1)
    expect(stderr).toMatch(/No type matches/)
  })
})

describe('archdraw schema', () => {
  it('prints the input contract as JSON Schema', () => {
    const { code, stdout } = run(['schema'])
    const schema = JSON.parse(stdout)

    expect(code).toBe(0)
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['provider', 'direction', 'nodes', 'edges']),
    )
  })

  it('--flat drops the nested children shape', () => {
    expect(JSON.stringify(JSON.parse(run(['schema', '--flat']).stdout))).not.toContain('children')
  })
})

describe('archdraw render', () => {
  it('reads stdin when the input is -', () => {
    const { code, stdout } = run(['-'], diagram)
    expect(code).toBe(0)
    expect(stdout).toMatch(/^<svg /)
  })

  it('--check validates and writes nothing', () => {
    const { code, stdout, stderr } = run(['-', '--check'], diagram)
    expect(code).toBe(0)
    expect(stdout).toBe('')
    expect(stderr.trim()).toBe('ok')
  })

  it('--check exits non-zero on an unknown type', () => {
    const { code, stderr } = run(['-', '--check'], 'nodes:\n  - { id: a, type: lambdaa }\n')
    expect(code).toBe(1)
    expect(stderr).toMatch(/Did you mean: lambda/)
  })
})
