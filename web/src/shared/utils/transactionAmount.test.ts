import { describe, expect, it } from 'vitest'
import { signedTransactionAmount } from './transactionAmount'

describe('signedTransactionAmount', () => {
  it('returns zero for excluded rows', () => {
    expect(signedTransactionAmount({ isExcluded: true, type: 'expense', amount: 50 })).toBe(0)
  })

  it('signs income and expense', () => {
    expect(signedTransactionAmount({ isExcluded: false, type: 'income', amount: 10 })).toBe(10)
    expect(signedTransactionAmount({ isExcluded: false, type: 'expense', amount: 10 })).toBe(-10)
  })
})
