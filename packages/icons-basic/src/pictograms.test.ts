import { describe, expect, it } from 'vitest'
import { basicCategories, basicIcons } from './index.js'

describe('basic pictograms', () => {
  it('provides 64 distinct self-contained outlines in eight categories', () => {
    const names = Object.values(basicCategories).flat()
    expect(new Set(names).size).toBe(64)
    expect(Object.keys(basicIcons.icons).sort()).toEqual(names.map((n) => `basic-${n}`).sort())
    expect(new Set(Object.values(basicIcons.icons).map((asset) => asset.content)).size).toBe(64)
    for (const asset of Object.values(basicIcons.icons)) {
      expect(asset.viewBox).toBe('0 0 24 24')
      expect(asset.monochrome).toBe(true)
      expect(asset.content).toContain('stroke="currentColor"')
      expect(asset.content).not.toMatch(/<script|<image|<foreignObject|\bid=|\bhref=|url\(/i)
    }
  })

  it('resolves English and Korean role aliases to existing canonical icons', () => {
    for (const slug of Object.values(basicIcons.aliases))
      expect(basicIcons.icons[slug]).toBeDefined()
    expect(basicIcons.aliases['대기']).toBe('basic-clock')
    expect(basicIcons.aliases['basic-decision']).toBe('basic-branch')
    expect(basicIcons.aliases['실패']).toBe('basic-error')
    expect(basicIcons.keywords?.['basic-hourglass']).toContain('대기')
  })
})
