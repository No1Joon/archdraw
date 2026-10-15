import type { IconPack } from './icons.js'
import type { Ir } from './normalize.js'
import { FLOW_KEYS, type Theme } from './render.js'
import type { Scenario } from './schema.js'
import type { ViewOptions } from './view.js'
import viewerRuntime from './viewer-bundle.generated.js'

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Pan and zoom over the drawing, in the page rather than in the SVG so the diagram is untouched. */
const SCRIPT = `
const stage = document.getElementById('stage')
let art = stage.firstElementChild
let k = 1, x = 0, y = 0, drag = null
const apply = () => { art.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + k + ')' }
const fit = () => {
  const w = Number(art.getAttribute('width')), h = Number(art.getAttribute('height'))
  k = Math.min(1, (innerWidth - 32) / w, (innerHeight - 32) / h)
  x = (innerWidth - w * k) / 2
  y = (innerHeight - h * k) / 2
  apply()
}
stage.addEventListener('wheel', (e) => {
  e.preventDefault()
  const next = Math.min(8, Math.max(0.05, k * Math.exp(-e.deltaY / 400)))
  // Hold the point under the cursor still, so zooming reads as moving closer to that spot.
  x = e.clientX - ((e.clientX - x) / k) * next
  y = e.clientY - ((e.clientY - y) / k) * next
  k = next
  apply()
}, { passive: false })
stage.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX - x, y: e.clientY - y }
  stage.setPointerCapture(e.pointerId)
})
stage.addEventListener('pointermove', (e) => {
  if (!drag) return
  x = e.clientX - drag.x
  y = e.clientY - drag.y
  apply()
})
stage.addEventListener('pointerup', () => { drag = null })
stage.addEventListener('dblclick', fit)
addEventListener('resize', fit)
fit()
`

/** Switching a scene only changes what is drawn — the layout was fixed before the page was made. */
const SCENE_SCRIPT = `
const data = JSON.parse(document.getElementById('views').textContent)
const buttons = [...document.querySelectorAll('#scenes [data-scene]')]
let selected = data.options.scenario || buttons[0]?.dataset.scene
const focus = document.getElementById('focus')
const collapsed = new Set(data.options.collapsed || data.ir.nodes.filter((n) => n.collapsed).map((n) => n.id))
let generation = 0
const show = async (id, refit = true) => {
  selected = id
  const revision = ++generation
  document.getElementById('view-status').textContent = 'Drawing…'
  document.querySelectorAll('#export-svg,#export-png').forEach((b) => { b.disabled = true })
  try {
    const markup = await ArchdrawViewer.renderView(data.ir, data.icons, data.theme,
      { scenario: id, focus: !!focus?.checked, collapsed: [...collapsed] })
    if (revision !== generation) return
    stage.innerHTML = markup
    art = stage.firstElementChild
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.scene === id))
    for (const box of document.querySelectorAll('[data-group]')) box.checked = !collapsed.has(box.dataset.group)
    if (refit) fit(); else apply()
    document.getElementById('view-status').textContent = ''
  } catch (error) {
    if (revision === generation) document.getElementById('view-status').textContent = error.message
  } finally {
    if (revision === generation) document.querySelectorAll('#export-svg,#export-png').forEach((b) => { b.disabled = false })
  }
}
for (const b of buttons) b.addEventListener('click', () => show(b.dataset.scene, !!focus?.checked))
focus?.addEventListener('change', () => show(selected))
for (const box of document.querySelectorAll('[data-group]')) box.addEventListener('change', () => {
  if (box.checked) collapsed.delete(box.dataset.group); else collapsed.add(box.dataset.group)
  show(selected)
})
document.getElementById('collapse-all')?.addEventListener('click', () => {
  data.ir.nodes.filter((n) => n.isGroup).forEach((n) => collapsed.add(n.id)); show(selected)
})
document.getElementById('expand-all')?.addEventListener('click', () => { collapsed.clear(); show(selected) })
if (buttons.length && !data.options.scenario) show(selected, false)
const download = (blob, extension) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = 'architecture' + (selected ? '-' + selected : '') + '.' + extension
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const exportSvg = () => {
  const copy = art.cloneNode(true)
  copy.style.removeProperty('transform')
  copy.querySelectorAll('.archdraw-flow').forEach((el) => el.remove())
  return copy
}
document.getElementById('export-svg').addEventListener('click', () =>
  download(new Blob([new XMLSerializer().serializeToString(exportSvg())], { type: 'image/svg+xml' }), 'svg'))
document.getElementById('export-png').addEventListener('click', async () => {
  const copy = exportSvg()
  const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const image = new Image()
  try {
    image.src = url; await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width * 2; canvas.height = image.height * 2
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((png) => { if (png) download(png, 'png') })
  } finally { URL.revokeObjectURL(url) }
})
`

/**
 * Under `archdraw serve`: a redraw reloads the page, and the page puts back where it was looking
 * and which scene was pressed, so an edit reads as the picture changing rather than starting over.
 * A broken save keeps the last drawing on screen and says why above it.
 */
const LIVE_SCRIPT = `
const KEY = 'archdraw-view'
let saved = null
try { saved = JSON.parse(sessionStorage.getItem(KEY)) } catch {}
if (saved) {
  k = saved.k; x = saved.x; y = saved.y; apply()
  if (typeof show === 'function') {
    if (focus) focus.checked = !!saved.focus
    if (Array.isArray(saved.collapsed)) { collapsed.clear(); saved.collapsed.forEach((id) => {
      if (data.ir.nodes.some((n) => n.id === id && n.isGroup)) collapsed.add(id)
    }) }
    const scene = data.ir.scenarios.some((s) => s.id === saved.scene) ? saved.scene : selected
    show(scene, false)
  }
}
const banner = document.getElementById('error')
const events = new EventSource('/events')
events.addEventListener('change', () => {
  const pressed = document.querySelector('#scenes [aria-pressed="true"]')
  try { sessionStorage.setItem(KEY, JSON.stringify({ k, x, y, scene: pressed && pressed.dataset.scene, focus: typeof focus !== 'undefined' && !!focus?.checked, collapsed: typeof collapsed !== 'undefined' ? [...collapsed] : undefined })) } catch {}
  location.reload()
})
events.addEventListener('broken', (e) => { banner.textContent = JSON.parse(e.data); banner.hidden = false })
events.addEventListener('ok', () => { banner.hidden = true })
`

interface PageData {
  ir: Ir
  icons: IconPack
  options: ViewOptions
}

function scenesHtml(scenarios: Scenario[], options: ViewOptions): string {
  const button = (scenario: Scenario) =>
    `<button type="button" data-scene="${escape(scenario.id)}" aria-pressed="${scenario.id === options.scenario}">${escape(scenario.label ?? scenario.id)}</button>`
  return `<div id="scenes" data-initial="${escape(options.scenario ?? scenarios[0]?.id ?? '')}">${scenarios.map(button).join('')}
${scenarios.length ? `<label><input id="focus" type="checkbox" ${options.focus ? 'checked' : ''}>Focus</label>` : ''}
<button id="export-svg" type="button">Export SVG</button><button id="export-png" type="button">Export PNG</button>
<span id="view-status" role="status"></span></div>`
}

function groupsHtml(ir: Ir, options: ViewOptions): string {
  const groups = ir.nodes.filter((node) => node.isGroup)
  if (!groups.length) return ''
  const collapsed = new Set(
    options.collapsed ?? groups.filter((node) => node.collapsed).map((node) => node.id),
  )
  return `<details id="groups"><summary>Groups</summary>
<button id="collapse-all" type="button">Collapse all</button><button id="expand-all" type="button">Expand all</button>
${groups.map((node) => `<label><input type="checkbox" data-group="${escape(node.id)}" ${collapsed.has(node.id) ? '' : 'checked'}>${escape(node.label)}</label>`).join('')}</details>`
}

/** Only worth drawing where the diagram says something is outside; one colour explains itself. */
function legendHtml(theme: Theme): string {
  const row = ([key, text]: (typeof FLOW_KEYS)[number]) =>
    `<span><i style="background:${theme[key]}"></i>${text}</span>`
  return `<div id="legend">${FLOW_KEYS.map(row).join('')}</div>`
}

/** One self-contained file: no network, no build step, nothing to serve it from. */
export function page(
  svg: string,
  title: string,
  theme: Theme,
  legend: boolean,
  scenarios: Scenario[] = [],
  live = false,
  data?: PageData,
): string {
  const interactive = !!data && (scenarios.length > 0 || data.ir.nodes.some((node) => node.isGroup))
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
html,body{margin:0;height:100%;background:${theme.background};color:${theme.text};font-family:${theme.fontFamily}}
#stage{position:fixed;inset:0;overflow:hidden;cursor:grab;touch-action:none}
#stage:active{cursor:grabbing}
#stage > svg{position:absolute;top:0;left:0;transform-origin:0 0}
#hint{position:fixed;left:12px;bottom:10px;font-size:12px;color:${theme.mutedText};pointer-events:none}
#legend{position:fixed;right:12px;bottom:10px;display:flex;gap:14px;font-size:12px;color:${theme.mutedText}}
#legend i{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}
#groups{position:fixed;right:12px;top:12px;background:${theme.background};padding:8px;border:1px solid ${theme.groupStroke};border-radius:8px;max-height:70vh;overflow:auto}
#groups label{display:block;font-size:13px;padding:6px}
#scenes{max-width:calc(100vw - 140px);position:fixed;left:12px;top:12px;display:flex;flex-wrap:wrap;gap:6px}
#scenes button{font:inherit;font-size:12px;padding:5px 11px;border-radius:999px;cursor:pointer;
background:${theme.groupFill};color:${theme.mutedText};border:1px solid ${theme.groupStroke}}
#error{position:fixed;top:12px;right:12px;max-width:min(640px,90vw);margin:0;padding:10px 14px;
white-space:pre-wrap;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;border-radius:8px;
background:${theme.background};color:#cf222e;border:1px solid #cf222e}
#scenes button[aria-pressed="true"]{background:${theme.flow ?? '#1f6feb'};border-color:${
    theme.flow ?? '#1f6feb'
  };color:#fff}
</style>
</head>
<body>
<div id="stage">${svg}</div>
<p id="hint">drag to pan · scroll to zoom · double-click to fit</p>
${legend ? legendHtml(theme) : ''}
${interactive && data ? scenesHtml(scenarios, data.options) + groupsHtml(data.ir, data.options) : ''}
<script id="views" type="application/json">${JSON.stringify(data ? { ...data, theme } : {}).replaceAll('<', '\\u003c')}</script>
<script>${SCRIPT}<\/script>
${interactive ? `<script>${viewerRuntime.replace(/<\/script/gi, '<\\/script')}</script><script>${SCENE_SCRIPT}<\/script>` : ''}${
  live ? `\n<pre id="error" hidden></pre>\n<script>${LIVE_SCRIPT}<\/script>` : ''
}
</body>
</html>
`
}
