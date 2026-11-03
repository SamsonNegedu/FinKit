import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { monthlyTrend } from './monthlyTrend'

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  ({
    id: `${date}-${amount}-${over.category ?? 'Rent'}`,
    date,
    description: 'x',
    amount,
    currency: 'EUR',
    type: 'expense',
    category: 'Rent',
    rawData: {},
    ...over,
  }) as Transaction

describe('monthlyTrend', () => {
  it('splits each month’s income into spent, put away and left over', () => {
    const rows = [
      tx('2026-01-02', 3000, { type: 'income', category: 'Income' }),
      tx('2026-01-05', 1000),
      tx('2026-01-10', 500, { category: 'Investment' }),
      tx('2026-02-02', 3000, { type: 'income', category: 'Income' }),
      tx('2026-02-05', 3500),
    ]
    const [jan, feb] = monthlyTrend(rows)

    expect(jan).toMatchObject({ key: '2026-01', income: 3000, spent: 1000, putAway: 500, leftOver: 1500, over: 0 })
    expect(feb).toMatchObject({ spent: 3500, leftOver: 0, over: 500 })
  })

  it('counts a payment moved to another month there', () => {
    const rows = [tx('2026-01-30', 800, { countsToMonth: '2026-02' }), tx('2026-02-03', 100)]

    expect(monthlyTrend(rows).map(m => [m.key, m.spent])).toEqual([['2026-02', 900]])
  })

  it('leaves out excluded payments and transfers', () => {
    const rows = [tx('2026-01-05', 400, { isExcluded: true }), tx('2026-01-06', 200, { category: 'Transfer' })]

    expect(monthlyTrend(rows)[0].spent).toBe(0)
  })
})
