import { describe, expect, it } from 'vitest'
import { signedTransactionAmount, sumSignedTransactionAmounts } from './transactionAmount'

describe('signedTransactionAmount', () => {
  it('returns zero for excluded rows', () => {
    expect(signedTransactionAmount({ isExcluded: true, type: 'expense', amount: 50 })).toBe(0)
  })

  it('signs income and expense', () => {
    expect(signedTransactionAmount({ isExcluded: false, type: 'income', amount: 10 })).toBe(10)
    expect(signedTransactionAmount({ isExcluded: false, type: 'expense', amount: 10 })).toBe(-10)
  })

  it('normalizes to cents before negating expenses', () => {
    expect(signedTransactionAmount({ isExcluded: false, type: 'expense', amount: 10.005 })).toBe(-10.01)
  })
})

describe('sumSignedTransactionAmounts', () => {
  it('sums many signed rows without drift', () => {
    const rows = [
      { isExcluded: false, type: 'income' as const, amount: 0.1 },
      { isExcluded: false, type: 'expense' as const, amount: 0.2 },
      { isExcluded: false, type: 'income' as const, amount: 0.2 },
    ]

    expect(sumSignedTransactionAmounts(rows)).toBe(0.1)
  })
})
