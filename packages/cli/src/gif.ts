import { createRequire } from 'node:module'
import type { SvgFrame } from '@archdraw/core'
import { Resvg } from '@resvg/resvg-js'
import type { Palette } from 'gifenc'

const { applyPalette, GIFEncoder, quantize }: typeof import('gifenc') = createRequire(
  import.meta.url,
)('gifenc')

const MAX_PIXELS = 16_000_000

/** Share one palette so unchanged icons and labels do not flicker between frames. */
export async function renderGif(
  frames: AsyncIterable<SvgFrame>,
  scale: number,
  font: string,
): Promise<Uint8Array> {
  const gif = GIFEncoder()
  let palette: Palette | undefined
  for await (const frame of frames) {
    const renderer = new Resvg(frame.svg, {
      fitTo: { mode: 'zoom', value: scale },
      font: { loadSystemFonts: false, fontFiles: [font], defaultFontFamily: 'Noto Sans KR' },
    })
    const width = Math.max(1, Math.round(renderer.width * scale))
    const height = Math.max(1, Math.round(renderer.height * scale))
    if (width > 65535 || height > 65535 || width * height > MAX_PIXELS) {
      throw new Error(
        'GIF frames must fit within 16 million pixels and 65535 per side. Reduce -s or use --focus/--collapse.',
      )
    }
    const image = renderer.render()
    const first = palette === undefined
    palette ??= quantize(image.pixels, 256)
    gif.writeFrame(applyPalette(image.pixels, palette), image.width, image.height, {
      palette: first ? palette : undefined,
      delay: frame.delay,
      repeat: 0,
      dispose: 1,
    })
  }
  if (!palette) throw new Error('Cannot encode a GIF without frames.')
  gif.finish()
  return gif.bytes()
}
