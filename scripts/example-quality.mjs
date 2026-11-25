import { execFileSync } from 'node:child_process'
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const baselinePath = 'scripts/example-quality.json'
const current = {}
for (const file of readdirSync('examples')
  .filter((file) => file.endsWith('.yaml'))
  .sort()) {
  const report = JSON.parse(
    execFileSync(
      process.execPath,
      ['packages/cli/dist/cli.mjs', `examples/${file}`, '--diagnostics', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  )
  const counts = new Map()
  for (const warning of report.diagnostics.filter((item) => item.severity === 'warning')) {
    const elements = warning.elements.map(({ kind, id }) => `${kind}:${id}`).sort()
    const key = [warning.code, ...elements].join(' ')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  current[file] = Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b, 'en')))
}

if (process.argv.includes('--update')) {
  writeFileSync(baselinePath, JSON.stringify(current, null, 2) + '\n')
} else {
  function compare(expected, enforce) {
    const lines = []
    for (const file of new Set([...Object.keys(expected), ...Object.keys(current)])) {
      if (!(file in expected) || !(file in current)) {
        lines.push(`- ${file}: ${file in current ? 'added' : 'removed'} example`)
        if (enforce) process.exitCode = 1
      }
      const before = expected[file] ?? {}
      const after = current[file] ?? {}
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const delta = (after[key] ?? 0) - (before[key] ?? 0)
        if (!delta) continue
        lines.push(`- ${file}: ${delta > 0 ? '+' : ''}${delta} ${key}`)
        if (enforce && delta > 0) process.exitCode = 1
      }
    }
    return lines.length ? lines.join('\n') : 'No warning changes.'
  }
  const message = compare(JSON.parse(readFileSync(baselinePath, 'utf8')), true)
  console.log(message)
  if (process.env.GITHUB_STEP_SUMMARY) {
    let changes = message
    const base = process.env.QUALITY_BASE_SHA
    if (base) {
      const files = execFileSync('git', ['ls-tree', '--name-only', base, '--', baselinePath], {
        encoding: 'utf8',
      })
      if (files.trim()) {
        const previous = execFileSync('git', ['show', `${base}:${baselinePath}`], {
          encoding: 'utf8',
        })
        changes = compare(JSON.parse(previous), false)
      }
    }
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Example routing quality\n\n${changes}\n`)
  }
}
