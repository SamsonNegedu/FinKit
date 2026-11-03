import { describe, it, expect } from 'vitest'
import { inPeriod, summarize } from '@/shared/utils/summary'
import { isLeftOutTransfer } from '@/shared/utils/transfers'
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
  it('shows an incoming own-account transfer once you included it, without counting it in the totals', () => {
    const moved = { type: 'income' as const, amount: 300, category: 'Transfer' }
    const auto = tx({ id: 'f', date: '2026-03-23', ...moved, isExcluded: true })
    const chosen = tx({ id: 'g', date: '2026-03-23', ...moved, isExcluded: false, excludedManually: true })
    const byRule = tx({ id: 'h', date: '2026-03-23', ...moved, isExcluded: false })

    expect([auto, chosen, byRule].map(isLeftOutTransfer)).toEqual([true, false, true])
    expect(summarize([...rows, chosen], null, 'EUR').totalIncome).toBe(100)
  })
})
