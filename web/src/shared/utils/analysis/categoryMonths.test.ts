import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { categoryByMonth } from './categoryMonths'

const tx = (date: string, amount: number, category: string, extra: Partial<Transaction> = {}) =>
  ({
    id: `${date}-${category}-${amount}`,
    date,
    amount,
    category,
    type: 'expense',
    description: category,
    ...extra,
  }) as Transaction

describe('categoryByMonth', () => {
  it('lays categories out per month, oldest first, ending at the newest month with data', () => {
    const { months, rows } = categoryByMonth(
      [tx('2026-09-03', 100, 'Groceries'), tx('2026-10-03', 150, 'Groceries'), tx('2026-10-05', 40, 'Dining')],
      3,
    )

    expect(months.map(m => m.month)).toEqual([8, 9, 10].map(m => m - 1))
    expect(rows.find(r => r.category === 'Groceries')?.cells).toEqual([0, 100, 150])
    expect(rows.find(r => r.category === 'Dining')?.cells).toEqual([0, 0, 40])
  })

  it('compares the newest month with the average of earlier months that had spending', () => {
    const { rows } = categoryByMonth(
      [tx('2026-08-03', 100, 'Groceries'), tx('2026-09-03', 200, 'Groceries'), tx('2026-10-03', 150, 'Groceries')],
      4,
    )

    expect(rows[0].usual).toBe(150)
  })

  it('leaves out transfers, excluded rows and savings, like the rest of Analytics', () => {
    const { rows } = categoryByMonth(
      [
        tx('2026-10-03', 500, 'Transfer'),
        tx('2026-10-04', 80, 'Groceries', { isExcluded: true }),
        tx('2026-10-05', 300, 'Savings'),
      ],
      2,
    )

    expect(rows).toEqual([])
  })

  it('is empty without transactions', () => {
    expect(categoryByMonth([])).toEqual({ months: [], rows: [], putAway: [] })
  })

  it('lists investments and savings apart from spending, month by month', () => {
    const { rows, putAway } = categoryByMonth([
      tx('2026-02-03', 40, 'Groceries'),
      tx('2026-02-05', 200, 'Investment', { recipient: 'Trade Republic' }),
      tx('2026-03-05', 250, 'Investment', { recipient: 'Trade Republic' }),
      tx('2026-03-06', 50, 'Savings'),
    ])

    expect(rows.map(r => r.category)).toEqual(['Groceries'])
    expect(putAway.map(r => [r.category, r.cells.slice(-2)])).toEqual([
      ['Investment', [200, 250]],
      ['Savings', [0, 50]],
    ])
  })
})
