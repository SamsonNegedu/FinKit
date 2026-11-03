import type { Transaction } from '@/shared/types'

/**
 * A transfer between your own accounts is left out of the transaction list, with one exception: an incoming one you
 * chose to include on the Income page. That lets money moved in to fund a trip show up so it can be added to the trip.
 * It is only about the list: the totals still leave every transfer out, so it never skews day-to-day income or spending.
 * Only your own choice counts, so a transfer the app marked as excluded stays out, and so does one a rule filed as a
 * transfer.
 */
export function isLeftOutTransfer(tx: Transaction): boolean {
  if (tx.category !== 'Transfer') {
    return false
  }

  return !(tx.type === 'income' && tx.excludedManually && !tx.isExcluded)
}
