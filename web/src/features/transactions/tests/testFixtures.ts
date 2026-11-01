import { Transaction } from '@/shared/types'

export function tx(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    date: '2026-10-05',
    description: 'x',
    amount: 10,
    currency: 'EUR',
    type: 'expense',
    rawData: {},
    ...partial,
  } as Transaction
}
