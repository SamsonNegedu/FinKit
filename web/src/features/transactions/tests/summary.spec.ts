import { describe, it, expect } from 'vitest'
import { inPeriod, summarize } from '@/shared/utils/summary'
import { tx } from './testFixtures'

describe('summary', () => {
  const rows = [
    tx({ id: 'a', date: '2026-03-02', type: 'expense', amount: 10, category: 'Groceries' }),
    tx({ id: 'b', date: '2026-03-20', type: 'expense', amount: 5, category: 'Groceries' }),
    tx({ id: 'c', date: '2026-03-21', type: 'expense', amount: 99, category: 'Transfer' }),
    tx({ id: 'd', date: '2026-03-22', type: 'income', amount: 100, category: 'Salary' }),
    tx({ id: 'e', date: '2026-04-01', type: 'expense', amount: 7, category: 'Other' }),
  ]

  it('keeps only the chosen period', () => {
    const range = { startDate: new Date(2026, 2, 1), endDate: new Date(2026, 2, 31) }

    expect(inPeriod(rows, range).map(t => t.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(inPeriod(rows, null)).toHaveLength(5)
  })
  it('leaves transfers out of the totals', () => {
    const s = summarize(rows, null, 'EUR')

    expect(s.totalExpense).toBe(22)
    expect(s.totalIncome).toBe(100)
    expect(s.categorySummary[0].category).toBe('Groceries')
  })
})
