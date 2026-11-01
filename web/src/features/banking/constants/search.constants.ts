const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

export interface BanksSearch {
  bank?: 'connected' | 'error'
  reason?: string
  c?: string
}

export function validateBanksSearch(s: Record<string, unknown>): BanksSearch {
  return {
    bank: s.bank === 'connected' || s.bank === 'error' ? s.bank : undefined,
    reason: str(s.reason),
    c: str(s.c),
  }
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
