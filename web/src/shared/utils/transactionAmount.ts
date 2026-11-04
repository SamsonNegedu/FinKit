import type { Transaction } from '@/shared/types'
import { fromMoneyMinor, moneyMinor } from './money'

function signedMinor(tx: Pick<Transaction, 'isExcluded' | 'type' | 'amount'>): number {
  if (tx.isExcluded) {
    return 0
  }

  const minor = moneyMinor(tx.amount)

  if (tx.type === 'income') {
    return minor
  }

  return -minor
}

/** Signed amount for totals: excluded rows are zero; income positive, expense negative (cent-safe). */
export function signedTransactionAmount(tx: Pick<Transaction, 'isExcluded' | 'type' | 'amount'>): number {
  return fromMoneyMinor(signedMinor(tx))
}

/** Sum of {@link signedTransactionAmount} over many rows without float drift. */
export function sumSignedTransactionAmounts(
  transactions: Iterable<Pick<Transaction, 'isExcluded' | 'type' | 'amount'>>,
): number {
  let minor = 0

  for (const tx of transactions) {
    minor += signedMinor(tx)
  }

  return fromMoneyMinor(minor)
}
