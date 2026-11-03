import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { analyze } from './analyze'
import { highlightsOf } from './highlights'
import { unusualOf } from './unusual'
import { earlierTransactions, previousRange } from './previousPeriod'

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: Math.random().toString(),
    date: '2026-03-10',
    description: 'x',
    amount: 10,
    currency: 'EUR',
    type: 'expense',
    category: 'Groceries',
    recipient: 'Rewe',
    rawData: {},
    ...over,
  }) as Transaction

describe('analyze', () => {
  it('keeps savings and investments out of what was spent, and shows them on their own', () => {
    const a = analyze(
      [
        tx({ amount: 100 }),
        tx({ amount: 250, category: 'Investment', recipient: 'Trade Republic' }),
        tx({ amount: 5, category: 'Transfer' }),
      ],
      null,
      10,
    )

    expect(a.spent).toBe(100)
    expect(a.setAside).toBe(250)
    expect(a.invested).toBe(250)
    expect(a.saved).toBe(0)
    expect(a.everyday).toBe(100)
    expect(a.everydayPerDay).toBe(10)
    expect(a.categories.map(c => c.category)).toEqual(['Groceries'])
  })

  it('counts income apart from spending, leaving out transfers and excluded rows', () => {
    const a = analyze(
      [
        tx({ amount: 3000, type: 'income', category: 'Income' }),
        tx({ amount: 500, type: 'income', category: 'Transfer' }),
        tx({ amount: 99, type: 'income', category: 'Income', isExcluded: true }),
        tx({ amount: 40 }),
      ],
      null,
      30,
    )

    expect(a.income).toBe(3000)
    expect(a.spent).toBe(40)
  })

  it('lists every category, with nothing rolled into an "Other (n)" row', () => {
    const rows = Array.from({ length: 14 }, (_, i) => tx({ category: `Cat ${i}`, amount: 10 + i }))
    const a = analyze(rows, null, 30)

    expect(a.categories).toHaveLength(14)
    expect(a.categories.some(c => c.category.startsWith('Other ('))).toBe(false)
  })

  it('merges a merchant however its name was typed', () => {
    const a = analyze(
      [tx({ recipient: 'Scalable Capital', amount: 100 }), tx({ recipient: 'Scalable capital', amount: 50 })],
      null,
      30,
    )

    expect(a.merchants).toHaveLength(1)
    expect(a.merchants[0]).toMatchObject({ total: 150, count: 2 })
  })

  it('compares each category with the period before', () => {
    const a = analyze([tx({ amount: 150 })], [tx({ amount: 100 })], 30)

    expect(a.previousSpent).toBe(100)
    expect(a.categories[0].previous).toBe(100)
    expect(analyze([tx({})], null, 30).categories[0].previous).toBeNull()
  })

  it('finds the largest payment and what repeats', () => {
    const a = analyze(
      [tx({ amount: 20, isRecurring: true }), tx({ amount: 300, recipient: 'Müller' }), tx({ amount: 80 })],
      null,
      30,
    )

    expect(a.largest).toMatchObject({ name: 'Müller' })
    expect(a.repeating).toBe(20)
  })
})

describe('highlightsOf', () => {
  it('says what is biggest and what changed most, only when it is notable', () => {
    const a = analyze(
      [tx({ amount: 400, category: 'Rent' }), tx({ amount: 150, category: 'Shopping' })],
      [tx({ amount: 400, category: 'Rent' }), tx({ amount: 50, category: 'Shopping' })],
      30,
    )
    const ids = highlightsOf(a, 'EUR').map(h => h.id)

    expect(ids).toEqual(['top', 'change', 'largest'])
    expect(highlightsOf(a, 'EUR')[1].text).toMatch(/Shopping rose by .*100/)
    const flat = analyze([tx({ amount: 100 })], [tx({ amount: 105 })], 30)

    expect(highlightsOf(flat, 'EUR').map(h => h.id)).not.toContain('change') // a small wobble is not news
  })

  it('points at Other when it is a big share, and stays quiet when it is small', () => {
    const big = analyze([tx({ amount: 80, category: 'Other' }), tx({ amount: 20 })], null, 30)
    const small = analyze([tx({ amount: 5, category: 'Other' }), tx({ amount: 95 })], null, 30)

    expect(highlightsOf(big, 'EUR').map(h => h.id)).toContain('other')
    expect(highlightsOf(small, 'EUR').map(h => h.id)).not.toContain('other')
  })
})

describe('previousRange', () => {
  it('is the same length straight before, and nothing for all time', () => {
    const r = previousRange({ startDate: new Date(2026, 2, 1), endDate: new Date(2026, 2, 31) })!

    expect(r.endDate.getDate()).toBe(28) // 28 Feb
    expect(Math.round((r.endDate.getTime() - r.startDate.getTime()) / 86_400_000)).toBe(30)
    expect(previousRange(null)).toBeNull()
  })
})

describe('earlierTransactions', () => {
  const march = { startDate: new Date(2026, 2, 1), endDate: new Date(2026, 2, 31) }

  it('has nothing to compare with when no data reaches back before the period', () => {
    expect(earlierTransactions([tx({ date: '2026-03-10' })], march)).toBeNull()
    expect(earlierTransactions([tx({ date: '2026-03-10' })], null)).toBeNull()
  })

  it('gives the earlier stretch once it holds transactions', () => {
    const rows = [tx({ date: '2026-02-10' }), tx({ date: '2026-03-10' })]

    expect(earlierTransactions(rows, march)).toHaveLength(1)
  })
})

describe('unusualOf', () => {
  const history = Array.from({ length: 80 }, (_, i) =>
    tx({ date: new Date(Date.UTC(2025, 9, 1 + i)).toISOString().slice(0, 10), amount: 12, recipient: `Shop ${i % 5}` }),
  )

  it('flags the same amount paid twice within a day, but not small or scheduled ones', () => {
    const rows = [
      tx({ date: '2026-01-10', amount: 89.9, recipient: 'Hardware Store' }),
      tx({ date: '2026-01-10', amount: 89.9, recipient: 'Hardware Store' }),
      tx({ date: '2026-01-10', amount: 3, recipient: 'Cafe' }),
      tx({ date: '2026-01-10', amount: 3, recipient: 'Cafe' }),
      tx({ date: '2026-01-11', amount: 40, recipient: 'Gym', isRecurring: true }),
      tx({ date: '2026-01-11', amount: 40, recipient: 'Gym', isRecurring: true }),
    ]

    expect(unusualOf(rows, rows).map(u => [u.kind, u.merchant])).toEqual([['double', 'Hardware Store']])
  })

  it('leaves out yourself, people who also pay you, and round amounts', () => {
    const pair = (over: Partial<Transaction>) => [
      tx({ date: '2026-01-10', amount: 89.9, ...over }),
      tx({ date: '2026-01-10', amount: 89.9, ...over }),
    ]
    const own = pair({ recipient: 'Samson Negedu', referenceAccountName: 'Samson Negedu' })
    const ownIban = pair({ recipient: 'Someone', recipientIban: 'DE00MINE', referenceAccount: 'DE00MINE' })
    const twoWay = [
      ...pair({ recipient: 'Alex' }),
      tx({ type: 'income', category: 'Income', recipient: 'Alex', amount: 50 }),
    ]
    const round = pair({ recipient: 'Landlord', amount: 200 }).map(t => ({ ...t, amount: 200 }))
    const real = pair({ recipient: 'Hardware Store' })

    for (const rows of [own, ownIban, twoWay, round]) {
      expect(unusualOf(rows, rows)).toEqual([])
    }
    expect(unusualOf(real, real)).toHaveLength(1)
  })

  it('flags a large first-time payee, only once there is enough history to call it new', () => {
    const big = tx({ date: '2026-01-05', amount: 650, recipient: 'Stranger Ltd' })

    expect(unusualOf([big], [...history, big]).map(u => u.kind)).toEqual(['newBig'])
    expect(unusualOf([big], [big])).toEqual([]) // no history: everything is new
    expect(unusualOf([tx({ amount: 650, recipient: 'Shop 1', date: '2026-01-05' })], history)).toEqual([])
  })
})
