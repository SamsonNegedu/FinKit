import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { commonTraits, netOf } from './listSummary'

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: 'x',
    date: '2026-10-01',
    description: 'd',
    amount: 10,
    type: 'expense',
    currency: 'EUR',
    ...over,
  }) as Transaction

describe('listSummary', () => {
  it('nets income against spending and skips excluded rows', () => {
    expect(netOf([tx({ amount: 50, type: 'income' }), tx({ amount: 20 }), tx({ amount: 500, isExcluded: true })])).toBe(
      30,
    )
  })

  it('names what recurring rows from one payee share', () => {
    const rows = [
      tx({ recipient: 'PayPal Europe S.a.r.l. et Cie S.C.A', description: 'bei MILES', isRecurring: true }),
      tx({ recipient: 'PayPal Europe S.a.r.l. et Cie S.C.A', description: 'bei Apple', isRecurring: true }),
    ]

    expect(commonTraits(rows)).toBe('All 2 are recurring, from PayPal Europe')
  })

  it('says nothing when the rows have nothing in common', () => {
    expect(commonTraits([tx({ recipient: 'Aldi' }), tx({ recipient: 'Rewe' })])).toBeNull()
  })
})
