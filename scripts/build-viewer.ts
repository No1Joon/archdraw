import { readFileSync, writeFileSync } from 'node:fs'
import { build } from 'tsdown'

await build({
  config: false,
  entry: ['src/viewer.ts'],
  outDir: '.cache/viewer',
  format: 'iife',
  globalName: 'ArchdrawViewer',
  platform: 'browser',
  deps: { alwaysBundle: [/.*/], onlyBundle: false },
  dts: false,
  clean: true,
  minify: true,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
})
const attribution = ['elkjs', 'react', 'react-dom']
  .map((name) => `${name}\n${readFileSync(`licenses/${name}.txt`, 'utf8')}`)
  .join('\n\n')
const runtime = `${readFileSync('.cache/viewer/viewer.iife.js', 'utf8')}\n/*\n${attribution}\n*/`

writeFileSync('src/viewer-bundle.generated.ts', `export default ${JSON.stringify(runtime)}\n`)
