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

// Real icon sizes decide where a wrap folds, so this one belongs with the bundled packs.
const wrappedGroups = `wrap: true
direction: DOWN
provider: aws

groups:
  - id: grp_ingest
    label: x
    children:
      - id: s3_raw
        label: x
        type: s3
      - id: glue
        label: x
        type: s3
      - id: lambda_norm
        label: x
        type: s3

  - id: grp_recovery
    label: x
    children:
      - id: sqs_dlq
        label: x
        type: s3
      - id: airflow
        label: x
        type: s3

  - id: grp_streaming
    label: x
    children:
      - id: kinesis
        label: x
        type: s3
      - id: flink
        label: x
        type: s3

  - id: grp_serving
    label: x
    children:
      - id: clickhouse
        label: x
        type: s3
      - id: grafana
        label: x
        type: s3

edges:
  - from: s3_raw
    to: lambda_norm
    label: x
  - from: lambda_norm
    to: glue
    label: x
    style: dashed
  - from: lambda_norm
    to: sqs_dlq
    label: x
  - from: sqs_dlq
    to: airflow
    label: x
  - from: airflow
    to: s3_raw
    label: x
    style: dashed
  - from: lambda_norm
    to: kinesis
    label: x
  - from: kinesis
    to: flink
    label: x
  - from: flink
    to: clickhouse
    label: x
  - from: clickhouse
    to: grafana
    label: x
`

describe('a wrapped diagram with groups', () => {
  it('lays out instead of throwing out of elk', () => {
    const { code, stdout, stderr } = run(['-', '-p', 'aws'], wrappedGroups)
    // SINGLE_EDGE wrapping threw java.util.NoSuchElementException on exactly this shape.
    expect(stderr).not.toContain('NoSuchElement')
    expect(code).toBe(0)
    expect(stdout).toContain('<svg')
  })
})

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

  it('drops matches where the query is buried mid-word', () => {
    const { stdout } = run(['types', 'alb', '-p', 'aws,brands'])
    expect(stdout).toContain('alb -> elastic-load-balancing')
    // 'alb' sits inside all of these, and an agent reads the whole list.
    for (const noise of ['virtualbox', 'actualbudget', 'socialblade', 'thurgauerkantonalbank']) {
      expect(stdout).not.toContain(noise)
    }
  })

  it('keeps a match that starts a word, buried or not', () => {
    const { stdout } = run(['types', 'postgres', '-p', 'aws,brands'])
    // 'postgres' only ever appears inside 'postgresql' here — dropping it loses the answer.
    expect(stdout).toContain('amazon-aurora-postgresql-instance')
  })

  it('leads with the closest match', () => {
    const { stdout } = run(['types', 'rds', '-p', 'aws'])
    expect(stdout.split('\n')[0]).toBe('rds -> amazon-rds')
  })

  it('surfaces the ECS icons whose slug spells the service out', () => {
    const { stdout } = run(['types', 'ecs', '-p', 'aws'])
    // None of these carry 'ecs' in the slug, so only an alias puts them in front of an agent.
    expect(stdout).toContain('ecs-task -> amazon-elastic-container-service-task')
    expect(stdout).toContain('ecs-service -> amazon-elastic-container-service-service')
  })

  it('shows the self-hosted mark beside the managed service', () => {
    const { stdout } = run(['types', 'airflow', '-p', 'aws,brands'])
    // brands runs its words together, so a rule that only reads word starts loses this one.
    expect(stdout).toContain('apacheairflow')
    expect(stdout).toContain('amazon-managed-workflows-for-apache-airflow')
  })

  it('fails with a hint when nothing matches', () => {
    const { code, stderr } = run(['types', 'zzzz'])
    expect(code).toBe(1)
    expect(stderr).toMatch(/No type matches/)
  })
})

describe('the detour note', () => {
  it('names the edge that pays for a group boundary', () => {
    const { code, stderr } = run(['examples/growth.yaml', '-p', 'aws,brands', '-o', '/dev/null'])
    expect(code).toBe(0)
    expect(stderr).toContain('queue -> worker')
    // It runs against the layout direction, so telling the author to regroup would mislead.
    expect(stderr).toContain('against direction: RIGHT')
    expect(stderr).not.toContain('putting the pair in one group')
  })

  it('stays quiet on a diagram that lays out straight', () => {
    const { stderr } = run(['examples/startup.yaml', '-p', 'aws,brands', '-o', '/dev/null'])
    // A false note costs more than a missing one: an agent would regroup a fine diagram.
    expect(stderr).not.toMatch(/routes? far around/)
  })

  it('never reaches stdout, which may be the SVG', () => {
    const { stdout } = run(['examples/growth.yaml', '-p', 'aws,brands'])
    expect(stdout).toContain('<svg')
    expect(stdout).not.toMatch(/direct line/)
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

describe('provider resolution', () => {
  const gcp = 'provider: gcp\nnodes:\n  - { id: a, type: gke }\n'

  it("loads the packs the diagram's own provider names", () => {
    const { code, stderr } = run(['-', '--check'], gcp)
    expect(code).toBe(0)
    expect(stderr.trim()).toBe('ok')
  })

  it('lets -p override what the diagram asked for', () => {
    const { code, stderr } = run(['-', '-p', 'aws', '--check'], gcp)
    expect(code).toBe(1)
    expect(stderr).toMatch(/Unknown type 'gke'/)
  })
})

describe('--scale', () => {
  it.each(['0', '-1', 'abc', '100'])('rejects %s before resvg sees it', (scale) => {
    const { code, stderr } = run(['-', '-s', scale, '-o', join(tmpdir(), 'ad-scale.png')], diagram)
    expect(code).toBe(1)
    expect(stderr).toMatch(/Scale must be a number/)
  })
})

describe('--theme', () => {
  it('draws on a dark ground when asked', () => {
    const { code, stdout } = run(['-', '--theme', 'dark'], diagram)
    expect(code).toBe(0)
    expect(stdout).toContain('#0d1117')
  })

  it('defaults to the light palette', () => {
    const { stdout } = run(['-'], diagram)
    expect(stdout).toContain('#ffffff')
    expect(stdout).not.toContain('#0d1117')
  })

  it('names the themes it knows when given one it does not', () => {
    const { code, stderr } = run(['-', '--theme', 'bogus'], diagram)
    expect(code).toBe(1)
    expect(stderr).toMatch(/Known: light, dark/)
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
