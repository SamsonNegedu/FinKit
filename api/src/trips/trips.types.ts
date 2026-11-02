export interface Trip {
  id: string
  name: string
  location: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  budgetCurrency: string | null
  /** The other people on the trip (you are always one more) */
  travelers: string[]
  archived: boolean
}

export interface TripItem {
  ref: string
  tripId: string
  kind: 'cost' | 'funding'
  category: string | null
  /** A finer label inside the category (Flight inside Transport); null when not given */
  subcategory: string | null
  place: string | null
  /** Split equally between you and the travelers */
  shared: boolean
  /** Who paid when it was not you; only manual entries can be paid by someone else */
  paidBy: string | null
}

/** A cost with no bank transaction behind it: cash, or paid from a balance FinKit doesn't see. */
export interface TripEntry {
  id: string
  tripId: string
  date: string
  amount: number
  currency: string
  note: string
}

export const MANUAL_PREFIX = 'manual:'
