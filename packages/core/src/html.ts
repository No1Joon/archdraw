import { FLOW_KEYS, type Theme } from './render.js'
import type { Scenario } from './schema.js'

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Pan and zoom over the drawing, in the page rather than in the SVG so the diagram is untouched. */
const SCRIPT = `
const stage = document.getElementById('stage')
const art = stage.firstElementChild
let k = 1, x = 0, y = 0, drag = null
const apply = () => { art.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + k + ')' }
const fit = () => {
  const box = art.getBoundingClientRect()
  const w = box.width / k, h = box.height / k
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
const marked = document.querySelectorAll('[data-when],[data-down]')
const buttons = [...document.querySelectorAll('#scenes button')]
const show = (id) => {
  for (const el of marked) {
    const when = el.getAttribute('data-when')
    const down = el.getAttribute('data-down')
    // Saying nothing means every scene, so only a named list can rule an element out.
    el.classList.toggle('archdraw-off', !!when && !when.split(' ').includes(id))
    el.classList.toggle('archdraw-down', !!down && down.split(' ').includes(id))
  }
  for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.scene === id))
}
for (const b of buttons) b.addEventListener('click', () => show(b.dataset.scene))
if (buttons.length) show(buttons[0].dataset.scene)
`

function scenesHtml(scenarios: Scenario[]): string {
  const button = (scenario: Scenario) =>
    `<button type="button" data-scene="${escape(scenario.id)}" aria-pressed="false">${escape(
      scenario.label ?? scenario.id,
    )}</button>`
  return `<div id="scenes">${scenarios.map(button).join('')}</div>`
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
): string {
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
#scenes{position:fixed;left:12px;top:12px;display:flex;flex-wrap:wrap;gap:6px}
#scenes button{font:inherit;font-size:12px;padding:5px 11px;border-radius:999px;cursor:pointer;
background:${theme.groupFill};color:${theme.mutedText};border:1px solid ${theme.groupStroke}}
#scenes button[aria-pressed="true"]{background:${theme.flow ?? '#1f6feb'};border-color:${
    theme.flow ?? '#1f6feb'
  };color:#fff}
</style>
</head>
<body>
<div id="stage">${svg}</div>
<p id="hint">drag to pan · scroll to zoom · double-click to fit</p>
${legend ? legendHtml(theme) : ''}
${scenarios.length ? scenesHtml(scenarios) : ''}
<script>${SCRIPT}<\/script>
${scenarios.length ? `<script>${SCENE_SCRIPT}<\/script>` : ''}
</body>
</html>
`
}
