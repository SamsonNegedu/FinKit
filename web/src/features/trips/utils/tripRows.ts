import type { Transaction } from '@/shared/types'
import type { TripTransaction } from '../api/trips.api'

/** What a funding row is called in the category column: money put into the trip, not a cost. */
export const FUNDING = 'Money put in'

/** A trip's transaction in the shape the shared transaction table shows. Its category is the trip category. */
export function toTableRow(t: TripTransaction): Transaction {
  const incoming = t.kind === 'funding' || t.amount > 0

  return {
    ...t,
    id: t.ref,
    type: incoming ? 'income' : 'expense',
    amount: Math.abs(t.amount),
    category: t.kind === 'funding' ? FUNDING : (t.tripCategory ?? 'Other'),
  }
}
