import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import {
  alertLine,
  budgetRows,
  capSummary,
  monthKey,
  setupSuggestions,
  suggestLimit,
  totalsOf,
  unbudgeted,
} from './budgetProgress'

const tx = (date: string, amount: number, category: string, over: Partial<Transaction> = {}): Transaction =>
  ({
    id: `${date}${amount}${category}`,
    date,
    amount,
    category,
    type: 'expense',
    description: '',
    ...over,
  }) as Transaction

const limits = [
  { category: 'Groceries', currency: 'EUR', amount: 400 },
  { category: 'Eating Out', currency: 'EUR', amount: 100 },
  { category: 'Rent', currency: 'USD', amount: 900 },
]
const OCT_10 = new Date(2026, 9, 10)

describe('budget progress', () => {
  it('counts only this month’s spending, as Analytics does', () => {
    const rows = budgetRows(
      limits,
      [
        tx('2026-10-02', 100, 'Groceries'),
        tx('2026-10-05', 60, 'Groceries', { isExcluded: true }),
        tx('2026-10-06', 50, 'Groceries', { category: 'Transfer' }),
        tx('2026-09-30', 70, 'Groceries'),
        tx('2026-10-07', 200, 'Groceries', { type: 'income' }),
      ],
      'EUR',
      OCT_10,
      2026,
      9,
    )

    expect(rows.find(r => r.category === 'Groceries')).toMatchObject({ spent: 100, left: 300, used: 0.25, state: 'ok' })
  })

  it('warns near the limit, flags an overspend, and puts the worst first', () => {
    const rows = budgetRows(
      limits,
      [tx('2026-10-02', 330, 'Groceries'), tx('2026-10-03', 120, 'Eating Out')],
      'EUR',
      OCT_10,
      2026,
      9,
    )

    expect(rows.map(r => [r.category, r.state])).toEqual([
      ['Eating Out', 'over'],
      ['Groceries', 'watch'],
    ])
  })

  it('projects the month from the pace so far, but not for a finished month', () => {
    const spend = [tx('2026-10-02', 100, 'Groceries')]

    expect(budgetRows(limits, spend, 'EUR', OCT_10, 2026, 9)[0].projected).toBeCloseTo(310)
    expect(budgetRows(limits, spend, 'EUR', new Date(2026, 10, 3), 2026, 9)[0].projected).toBeNull()
    // Too early in the month to call it a pace
    expect(budgetRows(limits, spend, 'EUR', new Date(2026, 9, 2), 2026, 9)[0].projected).toBeNull()
  })

  it('says how far through the month it is, only for the current month', () => {
    expect(budgetRows(limits, [], 'EUR', OCT_10, 2026, 9)[0].paceAt).toBeCloseTo(10 / 31)
    expect(budgetRows(limits, [], 'EUR', new Date(2026, 10, 3), 2026, 9)[0].paceAt).toBeNull()
  })

  it('ignores limits in another currency', () => {
    expect(budgetRows(limits, [], 'EUR', OCT_10, 2026, 9).map(r => r.category)).not.toContain('Rent')
  })

  it('totals the budgets and counts the ones in trouble', () => {
    const rows = budgetRows(
      limits,
      [tx('2026-10-02', 330, 'Groceries'), tx('2026-10-03', 120, 'Eating Out')],
      'EUR',
      OCT_10,
      2026,
      9,
    )

    expect(totalsOf(rows)).toEqual({ budgeted: 500, spent: 450, left: 50, over: 1, watch: 1 })
  })

  it('lists spending without a budget, biggest first', () => {
    const spend = [tx('2026-10-02', 30, 'Car'), tx('2026-10-03', 90, 'Travel'), tx('2026-10-04', 10, 'Groceries')]

    expect(unbudgeted(spend, limits, 2026, 9)).toEqual([
      { category: 'Travel', spent: 90 },
      { category: 'Car', spent: 30 },
    ])
  })

  it('suggests a limit from the last three months, rounded up', () => {
    const spend = [tx('2026-07-05', 100, 'Car'), tx('2026-08-05', 121, 'Car'), tx('2026-09-05', 100, 'Car')]

    expect(suggestLimit(spend, 'Car', 2026, 9)).toBe(110)
    expect(suggestLimit(spend, 'Travel', 2026, 9)).toBeNull()
  })

  it('suggests budgets for what you spent in lately, skipping budgeted, income and transfers', () => {
    const spend = [
      tx('2026-09-05', 100, 'Car'),
      tx('2026-09-06', 400, 'Groceries'),
      tx('2026-09-07', 50, 'Cash'),
      tx('2026-09-08', 900, 'Income'),
      tx('2026-08-08', 300, 'Transfer'),
    ]

    expect(setupSuggestions(spend, limits, 2026, 9)).toEqual([
      { category: 'Car', amount: 100 },
      { category: 'Cash', amount: 50 },
    ])
  })

  it('words one alert for the Overview, or none when all is well', () => {
    const at = (spend: Transaction[]) => budgetRows(limits, spend, 'EUR', OCT_10, 2026, 9)

    expect(alertLine(at([]), 'EUR')).toBeNull()
    expect(alertLine(at([tx('2026-10-02', 330, 'Groceries')]), 'EUR')).toBe('1 budget close to the limit')
    expect(alertLine(at([tx('2026-10-02', 330, 'Groceries'), tx('2026-10-03', 120, 'Eating Out')]), 'EUR')).toBe(
      'Eating Out is €20.00 over budget · 1 close to the limit',
    )
    expect(alertLine(at([tx('2026-10-02', 500, 'Groceries'), tx('2026-10-03', 120, 'Eating Out')]), 'EUR')).toContain(
      '(1 more over)',
    )
  })

  describe('rollover', () => {
    const car = { category: 'Car', currency: 'EUR', amount: 100, rollover: true, startsMonth: '2026-08' }
    const rowFor = (limit: object, spend: Transaction[], year: number, month: number) =>
      budgetRows([limit as (typeof limits)[number]], spend, 'EUR', new Date(2027, 0, 15), year, month)[0]

    it('carries only what was left unspent, month after month, from the month the budget began', () => {
      const spend = [tx('2026-08-10', 40, 'Car'), tx('2026-09-10', 130, 'Car')]

      // August: nothing came in. September: 100 + 60 left from August. October: 100 + 30 left from September
      expect(rowFor(car, spend, 2026, 7)).toMatchObject({ carried: 0, amount: 100, base: 100 })
      expect(rowFor(car, spend, 2026, 8)).toMatchObject({ carried: 60, amount: 160, left: 30 })
      expect(rowFor(car, spend, 2026, 9)).toMatchObject({ carried: 30, amount: 130 })
    })

    it('never carries an overspend, and counts nothing before the budget began', () => {
      const spend = [tx('2026-07-10', 5, 'Car'), tx('2026-09-10', 400, 'Car')]

      expect(rowFor(car, spend, 2026, 9).carried).toBe(0)
      expect(rowFor({ ...car, startsMonth: '2026-10' }, spend, 2026, 9).carried).toBe(0)
    })

    it('does nothing unless rollover is on and the start month is known', () => {
      expect(rowFor({ ...car, rollover: false }, [], 2026, 9).carried).toBe(0)
      expect(rowFor({ ...car, startsMonth: null }, [], 2026, 9).carried).toBe(0)
    })
  })

  describe('the overall cap', () => {
    const spend = [
      tx('2026-10-02', 300, 'Groceries'),
      tx('2026-10-03', 50, 'Hobbies'),
      tx('2026-10-04', 400, 'Investment'),
      tx('2026-10-05', 99, 'Car', { isExcluded: true }),
      tx('2026-09-30', 700, 'Groceries'),
    ]

    it('counts everything spent in the month, not only budgeted categories, and not money set aside', () => {
      const cap = capSummary([{ currency: 'EUR', amount: 500 }], spend, 'EUR', 2026, 9)

      expect(cap).toMatchObject({ cap: 500, spent: 350, left: 150, state: 'ok' })
      expect(cap?.used).toBeCloseTo(0.7)
    })

    it('warns and flags like a category budget, and is absent without a cap', () => {
      expect(capSummary([{ currency: 'EUR', amount: 400 }], spend, 'EUR', 2026, 9)?.state).toBe('watch')
      expect(capSummary([{ currency: 'EUR', amount: 300 }], spend, 'EUR', 2026, 9)).toMatchObject({
        state: 'over',
        left: -50,
      })
      expect(capSummary([], spend, 'EUR', 2026, 9)).toBeNull()
      expect(capSummary([{ currency: 'USD', amount: 500 }], spend, 'EUR', 2026, 9)).toBeNull()
    })
  })

  it('names a month the way the server stores it', () => {
    expect(monthKey(2026, 0)).toBe('2026-01')
    expect(monthKey(2026, 10)).toBe('2026-11')
  })
})
