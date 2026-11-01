const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

export interface TransactionsSearch {
  q?: string
  cat?: string[]
  bank?: string
  account?: string
  view?: 'merchants'
  transfers?: boolean
}

export const FILES = 'files'

export function validateTransactionsSearch(s: Record<string, unknown>): TransactionsSearch {
  const cat = Array.isArray(s.cat)
    ? s.cat.filter((c): c is string => typeof c === 'string')
    : typeof s.cat === 'string'
      ? [s.cat]
      : []
  return {
    q: str(s.q),
    cat: cat.length ? cat : undefined,
    bank: str(s.bank),
    account: str(s.account),
    view: s.view === 'merchants' ? 'merchants' : undefined,
    transfers: s.transfers === true || s.transfers === 'true' ? true : undefined,
  }
}
