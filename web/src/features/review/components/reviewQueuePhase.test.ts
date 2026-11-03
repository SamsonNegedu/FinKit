import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { merchantKeyOf } from '@/shared/utils/categorizer'
import { deriveReviewQueuePhase, reviewSessionReducer } from './reviewQueuePhase'

const tx = (id: string, over: Partial<Transaction> = {}): Transaction =>
  ({
    id,
    date: '2026-01-15',
    description: 'test',
    amount: 10,
    type: 'expense',
    currency: 'EUR',
    rawData: {},
    category: 'Other',
    ...over,
  }) as Transaction

describe('deriveReviewQueuePhase', () => {
  it('is empty when nothing needs review', () => {
    const session = { skipped: new Set<string>(), focusKey: null, totalAtStart: null }
    const derived = deriveReviewQueuePhase([tx('1', { category: 'Groceries' })], session)

    expect(derived.phase).toEqual({ kind: 'empty' })
  })

  it('is all_skipped when every group was skipped', () => {
    const t = tx('1')
    const session = {
      skipped: new Set([merchantKeyOf(t)]),
      focusKey: null,
      totalAtStart: 1,
    }
    const derived = deriveReviewQueuePhase([t], session)

    expect(derived.phase).toEqual({ kind: 'all_skipped', skippedCount: 1 })
  })

  it('is triaging when a group is current', () => {
    const session = { skipped: new Set<string>(), focusKey: null, totalAtStart: null }
    const derived = deriveReviewQueuePhase([tx('1')], session)

    expect(derived.phase).toEqual({ kind: 'triaging' })
    expect(derived.current).toBeDefined()
  })
})

describe('reviewSessionReducer', () => {
  it('resets skipped merchants', () => {
    const next = reviewSessionReducer(
      { skipped: new Set(['a']), focusKey: 'a', totalAtStart: 2 },
      { type: 'RESET_SKIPPED' },
    )

    expect(next.skipped.size).toBe(0)
    expect(next.focusKey).toBeNull()
  })
})
