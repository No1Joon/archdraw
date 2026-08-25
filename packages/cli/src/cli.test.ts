import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
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

  it('merges packs when -p lists several', () => {
    const { stdout } = run(['types', 'redis', '-p', 'aws,brands'])
    // The self-hosted mark and the managed service are different things.
    expect(stdout).toContain('redis -> redis')
    expect(stdout).toContain('amazon-elasticache')
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

describe('PNG text', () => {
  // A missing font family makes resvg draw nothing at all. Comparing two labels of equal
  // length in the same script holds the layout fixed, so only the glyphs can differ —
  // a blank render makes the two identical.
  const png = (label: string) => {
    const out = join(tmpdir(), `archdraw-font-${encodeURIComponent(label)}.png`)
    const { code, stderr } = run(
      ['-', '-o', out],
      `nodes:\n  - { id: a, type: ecs, label: "${label}" }\n`,
    )
    if (code !== 0) throw new Error(stderr)
    const bytes = readFileSync(out)
    rmSync(out, { force: true })
    return bytes
  }

  it('draws Hangul labels rather than leaving them blank', () => {
    expect(png('가가가').equals(png('나나나'))).toBe(false)
  })

  it('draws latin labels rather than leaving them blank', () => {
    expect(png('IIII').equals(png('WWWW'))).toBe(false)
  })
})

describe('icon packs together', () => {
  // Packs merge in `-p` order, so an alias that names another pack's slug silently changes
  // meaning with the order — exactly the wrong-icon substitution the packs exist to prevent.
  it('never lets one pack’s alias shadow another pack’s slug', async () => {
    const [aws, gcp, brands] = await Promise.all([
      import('@archdraw/icons-aws'),
      import('@archdraw/icons-gcp'),
      import('@archdraw/icons-brands'),
    ])
    const packs = [aws.awsIcons, gcp.gcpIcons, brands.brandIcons]
    const shadows = packs.flatMap((pack) =>
      Object.keys(pack.aliases).flatMap((alias) =>
        packs
          .filter((other) => other !== pack && other.icons[alias])
          .map((other) => `${pack.provider}:${alias} shadows ${other.provider} slug '${alias}'`),
      ),
    )
    expect(shadows).toEqual([])
  })

  it('keeps self-hosted software distinct from the managed service', () => {
    const { stdout } = run(['types', 'redis', '-p', 'gcp,brands'])
    expect(stdout).toContain('redis')
    expect(stdout).not.toContain('memorystore')
  })
})
