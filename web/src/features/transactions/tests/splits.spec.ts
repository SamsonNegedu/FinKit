import { describe, it, expect } from 'vitest'
import { recategorize } from '@/shared/utils/recategorize'
import { applySplits, removeSplit, isValidSplit, remaining, syncSplits } from '@/shared/utils/splits'
import { tx } from './testFixtures'

describe('splits', () => {
  const parent = tx({ id: 'p', amount: 100, merchant: 'Amazon', category: 'Shopping' })
  const parts = [
    { amount: 60, category: 'Shopping' },
    { amount: 40, category: 'Gifts' },
  ]

  it('validates that parts add up to the total', () => {
    expect(isValidSplit(100, parts)).toBe(true)
    expect(
      isValidSplit(100, [
        { amount: 60, category: 'A' },
        { amount: 30, category: 'B' },
      ]),
    ).toBe(false)
    expect(isValidSplit(100, [{ amount: 100, category: 'A' }])).toBe(false)
    expect(remaining(100, [{ amount: 33.33, category: 'A' }])).toBe(66.67)
  })

  it('replaces the parent by its parts and can restore it', () => {
    const split = applySplits([parent, tx({ id: 'o' })], { p: { parent, parts } })
    expect(split.map(t => t.id)).toEqual(['p~1', 'p~2', 'o'])
    expect(split[1]).toMatchObject({ amount: 40, category: 'Gifts', splitOf: 'p' })
    expect(removeSplit(split, 'p', parent).map(t => t.id)).toEqual(['p', 'o'])
  })

  it('does not learn or spread rules from split parts', () => {
    const list = applySplits([parent, tx({ id: 'q', merchant: 'Amazon', category: 'Other' })], { p: { parent, parts } })
    const r = recategorize(list, ['p~1'], 'Gifts')!
    expect(r.merchants).toEqual([])
    expect(r.siblingCount).toBe(0)
  })
})

describe('split edits survive re-processing', () => {
  it('copies part edits into the stored split', () => {
    const parent = tx({ id: 'p', amount: 100, merchant: 'Amazon', category: 'Shopping' })
    const parts = [
      { amount: 60, category: 'Shopping' },
      { amount: 40, category: 'Gifts' },
    ]
    const splits = { p: { parent, parts } }
    const shown = applySplits([parent], splits)
    const edited = recategorize(shown, ['p~2'], 'Travel')!.next
    const synced = syncSplits(splits, edited)
    expect(synced.p.parts[1].category).toBe('Travel')
    expect(applySplits([parent], synced).find(t => t.id === 'p~2')!.category).toBe('Travel')
  })

  it('remembers an excluded part, and leaves untouched splits alone', () => {
    const parent = tx({ id: 'p', amount: 100 })
    const parts = [
      { amount: 60, category: 'A' },
      { amount: 40, category: 'B' },
    ]
    const splits = { p: { parent, parts } }
    const shown = applySplits([parent], splits).map(t =>
      t.id === 'p~2' ? { ...t, isExcluded: true, excludedManually: true } : t,
    )
    const synced = syncSplits(splits, shown)
    expect(synced.p.parts[1].isExcluded).toBe(true)
    expect(applySplits([parent], synced).find(t => t.id === 'p~2')!.isExcluded).toBe(true)
    expect(syncSplits(splits, applySplits([parent], splits))).toBe(splits)
  })
})
