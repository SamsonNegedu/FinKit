import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { isCashWithdrawal } from './cashWithdrawal'
import { recategorize } from './recategorize'
import { unusualOf } from './analysis/unusual'
import { analyze } from './analysis/analyze'
import { highlightsOf } from './analysis/highlights'
import { categorizeWithRules, setLearnedMappings } from './categorizer'
import { buildReviewGroups, needsReview } from '@/features/review/components/reviewQueueUtils'

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: Math.random().toString(),
    date: '2026-03-10',
    description: 'x',
    amount: 100,
    currency: 'EUR',
    type: 'expense',
    category: 'Other',
    rawData: {},
    ...over,
  }) as Transaction
const atm = (over: Partial<Transaction> = {}) => tx({ description: 'Geldautomat Sparkasse Berlin', ...over })

describe('isCashWithdrawal', () => {
  it('recognises withdrawals in German and English, and nothing else', () => {
    for (const d of [
      'Geldautomat Sparkasse',
      'Bargeldauszahlung 12.03.',
      'ATM Withdrawal Berlin',
      'Withdrawn Transaction',
      'Abhebung',
    ]) {
      expect(isCashWithdrawal(tx({ description: d }))).toBe(true)
    }
    expect(isCashWithdrawal(tx({ description: 'REWE Markt' }))).toBe(false)
    expect(isCashWithdrawal(tx({ description: 'Geldautomat', type: 'income' }))).toBe(false)
  })
})

describe('recategorizing a cash withdrawal', () => {
  it('changes only that withdrawal: no rule is learned and the others are left alone', () => {
    const [a, b, c] = [atm(), atm(), atm({ category: 'Cash' })]
    const r = recategorize([a, b, c], [a.id], 'Driving lessons')!

    expect(r.merchants).toEqual([]) // nothing to learn, so nothing is saved as a rule
    expect(r.siblingCount).toBe(0)
    expect(r.next.find(t => t.id === a.id)).toMatchObject({ category: 'Driving lessons', categorySource: 'manual' })
    expect(r.next.find(t => t.id === b.id)!.category).toBe('Other')
    expect(r.next.find(t => t.id === c.id)!.category).toBe('Cash')
  })

  it('still spreads to the same shop for an ordinary merchant', () => {
    const [a, b] = [tx({ recipient: 'Rewe', description: 'Rewe' }), tx({ recipient: 'Rewe', description: 'Rewe' })]
    const r = recategorize([a, b], [a.id], 'Groceries')!

    expect(r.siblingCount).toBe(1)
  })
})

describe('withdrawals and the unusual-payment flags', () => {
  it('are never flagged as double charges', () => {
    const rows = [atm({ amount: 41.2 }), atm({ amount: 41.2 })]

    expect(unusualOf(rows, rows)).toEqual([])
  })
})

describe('cash withdrawals by default', () => {
  it('are Cash until you say what each was for, and a rule you set for them still wins', () => {
    const [a] = categorizeWithRules([atm({ category: undefined })])

    expect(a).toMatchObject({ category: 'Cash', categorySource: 'rule' })
    setLearnedMappings([{ merchant: 'Geldautomat Sparkasse Berlin', category: 'Other' }])
    expect(categorizeWithRules([atm({ category: undefined })])[0].category).toBe('Other')
    setLearnedMappings([])
  })

  it('wait in Review one at a time, until they are tagged by hand', () => {
    const rows = [
      atm({ category: 'Cash', id: '1', date: '2026-05-01' }),
      atm({ category: 'Cash', id: '2', date: '2026-05-09' }),
    ]

    expect(rows.every(needsReview)).toBe(true)
    expect(buildReviewGroups(rows)).toHaveLength(2) // not lumped into one "ATM" group
    expect(needsReview({ ...rows[0], category: 'Driving lessons', categorySource: 'manual' })).toBe(false)
    expect(needsReview({ ...rows[0], categorySource: 'manual' })).toBe(false) // "Cash" chosen on purpose
  })

  it('are counted as untagged cash in the insights until each has a purpose', () => {
    const rows = [
      atm({ category: 'Cash', amount: 200 }),
      atm({ category: 'Cash', amount: 40 }),
      atm({ category: 'Driving lessons', categorySource: 'manual', amount: 90 }),
    ]
    const a = analyze(rows, null, 30)

    expect(a.untaggedCash).toEqual({ count: 2, total: 240 })
    expect(highlightsOf(a, 'EUR').find(h => h.id === 'cash')!.text).toMatch(/240.*2 withdrawals/)
    expect(highlightsOf(analyze([rows[2]], null, 30), 'EUR').some(h => h.id === 'cash')).toBe(false)
  })
})
