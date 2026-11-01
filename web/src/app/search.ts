// What the address bar carries for each page. Filters live in the URL so a view can be bookmarked,
// shared with yourself, and survives the back button.

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

export interface TransactionsSearch {
  q?: string
  cat?: string[]
  bank?: string // a bank's name, or FILES for rows imported from files
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

export interface BanksSearch {
  bank?: 'connected' | 'error'
  reason?: string
  c?: string
}
export function validateBanksSearch(s: Record<string, unknown>): BanksSearch {
  return { bank: s.bank === 'connected' || s.bank === 'error' ? s.bank : undefined, reason: str(s.reason), c: str(s.c) }
}

export interface ConnectSearch {
  bank?: string
}
export const validateConnectSearch = (s: Record<string, unknown>): ConnectSearch => ({ bank: str(s.bank) })

export interface BackOfficeSearch {
  section?: 'sync-log' | 'audit'
}
export const validateBackOfficeSearch = (s: Record<string, unknown>): BackOfficeSearch => ({
  section: s.section === 'sync-log' || s.section === 'audit' ? s.section : undefined,
})
