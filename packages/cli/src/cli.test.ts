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

// A wrapped chain with no group in it — the shape a model reaches for when told to keep the
// picture narrow. The two dashed edges reach back across the fold.
const wrappedChain = `provider: aws,brands
title: 데이터 수집·집계 파이프라인
direction: RIGHT
shape: card
wrap: true

nodes:
  - id: s3
    type: amazon-simple-storage-service
    label: S3 원본 데이터
  - id: lambda
    type: aws-lambda
    label: Lambda 정규화
  - id: kinesis
    type: amazon-kinesis-data-streams
    label: Kinesis 스트림
  - id: flink
    type: apacheflink
    label: Flink 실시간 집계
  - id: clickhouse
    type: clickhouse
    label: ClickHouse 분석 저장소
  - id: grafana
    type: grafana
    label: Grafana 대시보드
  - id: glue
    type: aws-glue-data-catalog
    label: Glue Data Catalog 스키마
  - id: dlq
    type: amazon-simple-queue-service
    label: SQS DLQ 실패 이벤트
  - id: airflow
    type: apacheairflow
    label: Airflow 배치 재처리

edges:
  - from: s3
    to: lambda
    label: 원본 이벤트
  - from: lambda
    to: kinesis
    label: 정규화 데이터
  - from: kinesis
    to: flink
    label: 스트리밍
  - from: flink
    to: clickhouse
    label: 집계 결과
  - from: clickhouse
    to: grafana
    label: 조회·시각화
  - from: glue
    to: lambda
    label: 스키마 참조
    style: dashed
  - from: glue
    to: flink
    label: 스키마 참조
    style: dashed
  - from: lambda
    to: dlq
    label: 정규화 실패
    style: dashed
  - from: flink
    to: dlq
    label: 처리 실패
    style: dashed
  - from: dlq
    to: airflow
    label: 실패건 수집
    style: dashed
  - from: airflow
    to: s3
    label: 배치 재처리
    style: dashed
`

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

  it('names the pack that answers when the loaded one does not', () => {
    const { stderr } = run(['types', 'clickhouse'])
    // 'another pack: aws, gcp, brands' leaves the caller to try all three.
    expect(stderr).toContain("Also in 'brands': clickhouse")
    expect(stderr).toContain('-p aws,brands')
  })

  it('names the self-hosted mark another pack holds even when this one answers', () => {
    const { stdout, stderr } = run(['types', 'flink'])
    // An answer from aws alone reads as if the managed service were the only Flink there is.
    expect(stdout).toContain('amazon-managed-service-for-apache-flink')
    expect(stderr).toContain("Also in 'brands': apacheflink")
  })

  it('counts an alias and its slug as one answer in that note', () => {
    const { stderr } = run(['types', 'airflow'])
    expect(stderr).toContain("Also in 'brands': apacheairflow.")
  })

  it('answers several queries in one run, each under its own heading', () => {
    // A diagram needs a dozen types looked up; one call per service costs seconds each.
    const { code, stdout } = run(['types', 'lambda', 'flink', '-p', 'aws,brands'])
    expect(code).toBe(0)
    expect(stdout).toContain('# lambda')
    expect(stdout).toContain('lambda -> aws-lambda')
    expect(stdout).toContain('# flink')
    expect(stdout).toContain('apacheflink')
  })

  it('leaves a single query’s output exactly as it was', () => {
    expect(run(['types', 'lambda']).stdout.startsWith('lambda -> aws-lambda')).toBe(true)
  })

  it('shortlists each query of a batch so one cannot fill the answer', () => {
    const alone = run(['types', 's3']).stdout.trim().split('\n').length
    const batched = run(['types', 's3', 'lambda']).stdout.trim().split('\n')
    expect(alone).toBeGreaterThan(20)
    expect(batched.filter((line) => line.startsWith('amazon-simple-storage')).length).toBeLessThan(
      alone,
    )
  })

  it('still answers the queries that landed when one of them misses', () => {
    const { code, stdout, stderr } = run(['types', 'lambda', 'kinesiss'])
    expect(stdout).toContain('lambda -> aws-lambda')
    expect(stderr).toContain("No type matches 'kinesiss'")
    // A miss is a type the diagram cannot use, so the run fails even beside a good answer.
    expect(code).toBe(1)
  })

  it('does not volunteer a pack whose only match is a word ending', () => {
    const { stderr } = run(['types', 'rds'])
    // 'rds' does end 'awwwards', and nobody asking about RDS wants to hear it.
    expect(stderr).not.toContain('awwwards')
    expect(stderr).not.toContain('Also in')
  })

  it('keeps the note off stdout, which a caller may be parsing', () => {
    const { stdout } = run(['types', 'flink'])
    expect(stdout).not.toContain('Also in')
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

  it('blames the wrap, not a boundary, on a diagram that has no groups', () => {
    const { stderr } = run(['-', '-p', 'aws,brands', '-o', '/dev/null'], wrappedChain)
    expect(stderr).toMatch(/routes? far around/)
    // There is nothing to regroup here, so the group advice would send an agent nowhere.
    expect(stderr).toContain('spans two rows of the wrap')
    expect(stderr).not.toContain('crosses a group boundary')
    expect(stderr).not.toContain('putting the pair in one group')
  })
})

describe('the note on a diagram that only renders here', () => {
  const short = 'provider: aws\nnodes:\n  - { id: a, type: apacheflink, label: x }\n'

  it('names the types the file’s own provider does not cover', () => {
    const { code, stderr } = run(['-', '-p', 'aws,brands', '--check'], short)
    expect(code).toBe(0)
    expect(stderr).toContain('apacheflink')
    expect(stderr).toContain('provider: aws,brands')
  })

  it('stays quiet when the file renders on its own', () => {
    const { stderr } = run(['-', '-p', 'aws,brands', '--check'], diagram)
    // `-p` is also just an override; only a file that cannot stand alone is worth a word.
    expect(stderr).not.toContain('nowhere else')
  })
})

describe('the note on a literal line break', () => {
  it('names the labels that draw \\n as text', () => {
    const escaped = 'nodes:\n  - { id: a, type: ecs, label: "one\\\\ntwo" }\n'
    const { code, stderr } = run(['-', '--check'], escaped)
    expect(code).toBe(0)
    expect(stderr).toContain('literal \\n')
    expect(stderr).toContain('a')
  })

  it('stays quiet on a label that really does break', () => {
    const real = 'nodes:\n  - { id: a, type: ecs, label: "one\\ntwo" }\n'
    expect(run(['-', '--check'], real).stderr).not.toContain('literal')
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

describe('an .html out path', () => {
  it('writes a page that animates, where the same diagram as svg does not', () => {
    const out = join(tmpdir(), 'archdraw-flow.html')
    rmSync(out, { force: true })
    const { code, stderr } = run(['-', '-o', out], diagram)
    expect(code, stderr).toBe(0)
    const html = readFileSync(out, 'utf8')
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('@keyframes archdraw-flow')
    expect(run(['-'], diagram).stdout).not.toContain('archdraw-flow')
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
