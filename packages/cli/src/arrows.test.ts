import { renderToSvg } from '@archdraw/core'
import { Resvg } from '@resvg/resvg-js'
import { describe, expect, it } from 'vitest'

interface Point {
  x: number
  y: number
}

describe('raster arrow directions', () => {
  it.each(['RIGHT', 'DOWN'])(
    'points a self-loop into its node in a %s layout',
    async (direction) => {
      let end: Point | undefined
      let before: Point | undefined
      const svg = await renderToSvg(
        {
          direction,
          nodes: [{ id: 'start' }, { id: 'pending', label: 'PENDING\n인증 대기' }, { id: 'done' }],
          edges: [
            { from: 'start', to: 'pending' },
            { from: 'pending', to: 'pending', label: '재발송(3회까지) · 틀림' },
            { from: 'pending', to: 'done' },
          ],
        },
        {
          onLayout: (_ir, root) => {
            const edge = root.edges?.find((edge) => edge.id === 'e1') as {
              sections?: { startPoint: Point; bendPoints?: Point[]; endPoint: Point }[]
            }
            const section = edge.sections?.[0]
            end = section?.endPoint
            before = section?.bendPoints?.at(-1) ?? section?.startPoint
          },
        },
      )
      if (!end || !before) throw new Error('Self-loop route was not generated')
      const length = Math.hypot(end.x - before.x, end.y - before.y)
      const dx = (end.x - before.x) / length
      const dy = (end.y - before.y) / length
      const image = new Resvg(svg, {
        fitTo: { mode: 'zoom', value: 4 },
        font: { loadSystemFonts: false },
      }).render()
      // Inside the triangular head, beside the final line segment rather than on its stroke.
      const x = Math.floor((end.x - dx * 4.5 - dy * 2) * 4)
      const y = Math.floor((end.y - dy * 4.5 + dx * 2) * 4)
      const pixel = (y * image.width + x) * 4
      expect(Array.from(image.pixels.subarray(pixel, pixel + 3))).toEqual([91, 102, 117])
    },
  )
})
