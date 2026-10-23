import { describe, expect, it } from 'vitest'
import { renderGif } from './gif.js'

describe('GIF raster limits', () => {
  it('rejects oversized frames before allocating their pixel buffers', async () => {
    async function* frames() {
      yield {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="5000" height="5000"/>',
        delay: 50,
      }
    }
    await expect(renderGif(frames(), 1, '')).rejects.toThrow('Reduce -s')
  })
})
