import type { RawTransaction } from '@/shared/types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface Trip {
  id: string
  name: string
  location: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  budgetCurrency: string | null
  travelers: string[]
  archived: boolean
}
export interface TripSummary extends Trip {
  transactionCount: number
  totals: TripMoney[]
}
export interface TripInput {
  name: string
  location: string
  startDate?: string | null
  endDate?: string | null
  budget?: number | null
  budgetCurrency?: string | null
  travelers?: string[]
  archived?: boolean
}
export type TripItemKind = 'cost' | 'funding'
export interface TripTransaction extends RawTransaction {
  ref: string
  kind: TripItemKind
  tripCategory: string | null
  tripSubcategory: string | null
  place: string | null
  shared: boolean
  paidBy: string | null
  /** Typed in by hand (cash, another balance), not from a bank sync */
  manual: boolean
}
export interface Slice {
  amount: number
  share: number
}
/** Just the money figures, per currency: what a card on the list needs. */
export interface TripMoney {
  currency: string
  funded: number
  spent: number
  remaining: number
  mine: number
}
export interface TripTotals {
  currency: string
  funded: number
  spent: number
  remaining: number
  mine: number
  byCategory: Array<{ category: string } & Slice>
  /** Only where a subcategory was given; what is left of a category has none */
  bySubcategory: Array<{ category: string; subcategory: string; amount: number }>
  byPlace: Array<{ place: string } & Slice>
  byDay: Array<{ date: string; amount: number }>
  byPhase: { before: number; during: number; after: number }
  settlement: Array<{ name: string; amount: number }>
}
export interface TripDetail {
  trip: Trip
  transactions: TripTransaction[]
  missing: number
  totals: TripTotals[]
}
export interface TagItem {
  ref: string
  kind: TripItemKind
  category?: string
  /** null clears it; leaving it out keeps it, unless the category changes */
  subcategory?: string | null
  place?: string | null
  shared?: boolean
  paidBy?: string | null
}
export interface EntryInput {
  date: string
  amount: number
  currency: string
  note: string
  category: string
  subcategory?: string | null
  place?: string | null
  shared?: boolean
  paidBy?: string | null
}

export class TripsError extends Error {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        // A header other websites cannot send: the server requires it on every changing request
        ...(init.method && init.method !== 'GET' ? { 'X-FinKit': '1' } : {}),
      },
      credentials: 'same-origin',
    })
  } catch {
    throw new TripsError("Couldn't reach FinKit's server.")
  }
  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new TripsError(typeof body.error === 'string' ? body.error : 'Something went wrong.')
  }

  return body as T
}

const send = (method: string, body?: unknown) => ({ method, ...(body ? { body: JSON.stringify(body) } : {}) })

export const listTrips = () => call<{ trips: TripSummary[] }>('/trips').then(r => r.trips)
export const getTrip = (id: string) => call<TripDetail>(`/trips/${id}`)
export const createTrip = (input: TripInput) => call<Trip>('/trips', send('POST', input))
export const updateTrip = (id: string, input: Partial<TripInput>) => call<Trip>(`/trips/${id}`, send('PATCH', input))
export const deleteTrip = (id: string) => call<unknown>(`/trips/${id}`, send('DELETE'))
export const addEntry = (id: string, entry: EntryInput) =>
  call<{ ref: string }>(`/trips/${id}/entries`, send('POST', entry))
export const tagItems = (id: string, items: TagItem[]) => call<unknown>(`/trips/${id}/items`, send('POST', { items }))
export const untagItems = (id: string, refs: string[]) =>
  call<unknown>(`/trips/${id}/items/remove`, send('POST', { refs }))
export interface TripCategories {
  categories: string[]
  /** Suggestions per category: the built-in ones, then any the person typed before */
  subcategories: Record<string, string[]>
}
export const listTripCategories = () => call<TripCategories>('/trip-categories')
export const addTripCategory = (name: string) => call<unknown>('/trip-categories', send('POST', { name }))
export const removeTripCategory = (name: string) =>
  call<unknown>(`/trip-categories/${encodeURIComponent(name)}`, send('DELETE'))
