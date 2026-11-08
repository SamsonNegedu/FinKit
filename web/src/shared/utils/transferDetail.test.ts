import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { transferDetail } from './transferDetail'

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: '1',
    date: '2026-01-01',
    description: 'x',
    amount: 5,
    currency: 'EUR',
    type: 'expense',
    rawData: {},
    ...over,
  }) as Transaction

describe('transferDetail', () => {
  it('names both ends of an outgoing transfer, masked', () => {
    expect(
      transferDetail(tx({ category: 'Transfer', recipientIban: 'DE89 3704 0044 0532 0130 00', accountLabel: '…5678' })),
    ).toBe('To …3000 · from …5678')
  })

  it('flips the wording for an incoming one', () => {
    expect(
      transferDetail(tx({ category: 'Transfer', type: 'income', recipientIban: 'DE8937040044053201301234' })),
    ).toBe('From …1234')
  })

  it('is empty for other rows and for a transfer with no account details', () => {
    expect(transferDetail(tx({ category: 'Food', recipientIban: 'DE89' }))).toBeUndefined()
    expect(transferDetail(tx({ category: 'Transfer' }))).toBeUndefined()
  })
})
