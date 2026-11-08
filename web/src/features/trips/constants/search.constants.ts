/** What the breakdown calls the part of a category that has no subcategory. */
export const NOT_SPECIFIED = 'Not specified'

/** The first tab carries no param, so /trips/:id stays the plain link. */
export interface TripSearch {
  tab?: 'transactions' | 'manage'
  /** Show only this category's costs on the Transactions tab */
  cat?: string
  /** ...and only this subcategory of it (NOT_SPECIFIED for the ones without) */
  sub?: string
  /** Text or amount typed in the search box on the Transactions tab */
  q?: string
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

export function validateTripSearch(s: Record<string, unknown>): TripSearch {
  const tab = s.tab === 'transactions' || s.tab === 'manage' ? s.tab : undefined
  const cat = tab === 'transactions' ? str(s.cat) : undefined

  return { tab, cat, sub: cat ? str(s.sub) : undefined, q: tab === 'transactions' ? str(s.q) : undefined }
}
