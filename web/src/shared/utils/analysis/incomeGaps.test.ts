import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { incomeGaps } from './incomeGaps'
import { monthGroups } from './sheetYear'

const pay = (id: string, date: string, over: Partial<Transaction> = {}): Transaction =>
  ({
    id,
    date,
    description: 'Salary',
    amount: 2800,
    currency: 'EUR',
    type: 'income',
    category: 'Income',
    rawData: {},
    ...over,
  }) as Transaction

const spend = (date: string) => pay(`s-${date}`, date, { type: 'expense', category: 'Rent', amount: 100 })

describe('incomeGaps', () => {
  it('flags a month with no income and offers the early payment from the next month', () => {
    const rows = [
      pay('jul', '2026-07-28'),
      spend('2026-08-12'),
      pay('sep1', '2026-09-01'),
      pay('sep2', '2026-09-28'),
      pay('oct', '2026-10-28'),
    ]
    const gaps = incomeGaps(monthGroups(rows))

    expect(gaps.map(g => g.key)).toEqual(['2026-08'])
    expect(gaps[0].suggestion?.tx.id).toBe('sep1')
  })

  it('offers a late payment from the previous month when that fits', () => {
    const rows = [
      pay('jun', '2026-06-27'),
      pay('jul1', '2026-07-02'),
      pay('jul2', '2026-07-30'),
      spend('2026-08-10'),
      pay('sep', '2026-09-28'),
    ]

    expect(incomeGaps(monthGroups(rows))[0].suggestion?.tx.id).toBe('jul2')
  })

  it('flags the gap without a suggestion when no neighbour has a spare payment', () => {
    const rows = [pay('jul', '2026-07-28'), spend('2026-08-12'), pay('sep', '2026-09-28')]

    expect(incomeGaps(monthGroups(rows))).toEqual([{ key: '2026-08', label: 'August 2026', suggestion: undefined }])
  })

  it('does not flag the months before the first or after the last income', () => {
    const rows = [spend('2026-05-10'), pay('jun', '2026-06-28'), pay('jul', '2026-07-28'), spend('2026-08-10')]

    expect(incomeGaps(monthGroups(rows))).toEqual([])
  })

  it('leaves a payment the person placed by hand out of the suggestions', () => {
    const rows = [
      pay('jul', '2026-07-28'),
      spend('2026-08-12'),
      pay('sep1', '2026-09-01', { countsToMonth: '2026-09', countsToMonthSource: 'manual' }),
      pay('sep2', '2026-09-28'),
      pay('oct', '2026-10-28'),
    ]

    expect(incomeGaps(monthGroups(rows))[0].suggestion).toBeUndefined()
  })
})
