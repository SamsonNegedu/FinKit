import { describe, expect, it } from 'vitest'
import { FEATURE_GUIDE_SECTIONS, visibleFeatureGuideSections } from './featureGuide'

describe('featureGuide', () => {
  it('drops banking-only articles when banking is off', () => {
    const off = visibleFeatureGuideSections(false)
    const ids = off.flatMap(s => s.articles.map(a => a.id))

    expect(ids).not.toContain('banks')
    expect(ids).toContain('transactions')
  })

  it('keeps unique article ids across sections', () => {
    const ids = FEATURE_GUIDE_SECTIONS.flatMap(s => s.articles.map(a => a.id))

    expect(new Set(ids).size).toBe(ids.length)
  })

  const articles = FEATURE_GUIDE_SECTIONS.flatMap(s => s.articles)

  it('gives every article a one-line summary and at least one tip', () => {
    const incomplete = articles.filter(a => a.summary.length < 10 || a.tips.length === 0).map(a => a.id)

    expect(incomplete).toEqual([])
  })

  it('points only at in-app routes, and does not mention the retired Export page', () => {
    const badLinks = articles.filter(a => a.to && !a.to.startsWith('/')).map(a => a.id)

    expect(badLinks).toEqual([])
    expect(JSON.stringify(FEATURE_GUIDE_SECTIONS)).not.toMatch(/Export preview|\/export|Learned rules/)
  })
})
