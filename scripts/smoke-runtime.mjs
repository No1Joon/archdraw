import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../packages/cli/dist/cli.mjs', import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'archdraw-runtime-'))
const started = performance.now()
const source = `provider: aws,brands
nodes:
  - { id: api, type: ecs, label: API 서버 }
  - { id: cache, type: redis, label: 캐시 }
edges: [{ from: api, to: cache }]
`
const run = (args, input = source, status = 0) => {
  const result = spawnSync(process.execPath, [cli, '-', ...args], {
    input,
    encoding: 'utf8',
    timeout: 20_000,
  })
  assert.ifError(result.error)
  assert.equal(result.status, status, result.stderr || result.stdout)
  return result
}

try {
  assert.deepEqual(JSON.parse(run(['--check', '--json']).stdout), {
    version: 1,
    valid: true,
    errors: [],
  })
  const bad = JSON.parse(run(['--check', '--json'], 'nodes: [{id: bad, type: lambdaa}]', 1).stdout)
  assert.equal(bad.valid, false)
  assert.equal(bad.errors[0].code, 'unknown-type')
  assert.deepEqual(bad.errors[0].path, ['nodes', 0, 'type'])
  const svg = run([]).stdout
  assert.match(svg, /<svg/)
  assert.match(svg, /API 서버/)
  for (const ext of ['png', 'gif', 'html']) run(['-o', join(dir, `diagram.${ext}`)])
  const png = readFileSync(join(dir, 'diagram.png'))
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.ok(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0)
  run(['-o', join(dir, 'different.png')], source.replace('API 서버', 'API 비교'))
  assert.ok(!png.equals(readFileSync(join(dir, 'different.png'))), 'Hangul glyphs must render')
  assert.equal(readFileSync(join(dir, 'diagram.gif')).subarray(0, 6).toString(), 'GIF89a')
  assert.match(readFileSync(join(dir, 'diagram.html'), 'utf8'), /<svg/)
  console.log(
    `Node ${process.version}: validation JSON + SVG/PNG/GIF/HTML smoke passed in ${((performance.now() - started) / 1000).toFixed(2)}s`,
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}
