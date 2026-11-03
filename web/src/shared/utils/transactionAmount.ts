import type { Transaction } from '@/shared/types'

/** Signed amount for totals: excluded rows are zero; income positive, expense negative. */
export function signedTransactionAmount(tx: Pick<Transaction, 'isExcluded' | 'type' | 'amount'>): number {
  if (tx.isExcluded) {
    return 0
  }

  if (tx.type === 'income') {
    return tx.amount
  }

  return -tx.amount
}
