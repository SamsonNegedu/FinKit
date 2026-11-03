import type { Transaction } from '@/shared/types'

const monthOf = (date: string) => date.slice(0, 7)

/**
 * The date a transaction counts on in monthly totals, budgets and charts. It is the bank's date, unless the charge
 * was made to count for another month (a May payment taken on 30 Apr counts on 1 May). The bank date itself is
 * never changed: the table still shows it.
 */
export function countedDate(tx: Pick<Transaction, 'date' | 'countsToMonth'>): string {
  const target = tx.countsToMonth

  if (!target || target === monthOf(tx.date)) {
    return tx.date
  }
  if (target > monthOf(tx.date)) {
    return `${target}-01`
  }
  const [y, m] = target.split('-').map(Number)

  return `${target}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}
