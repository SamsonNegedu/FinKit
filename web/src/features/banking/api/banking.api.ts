import { RawTransaction } from '@/shared/types'
import {
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  TIME_AGO_YESTERDAY_SECONDS,
} from '@/shared/constants/time'
import { API_BASE, getHeaders } from '@/shared/services/http'

interface BankingStatus {
  enabled: boolean
  provider?: 'mock' | 'enablebanking'
  mock?: boolean
  expiringDays?: number
}
export interface BankInfo {
  name: string
  country: string
  maxConsentDays: number
}
export interface BankConnection {
  id: string
  bank: string
  country: string
  status: 'active' | 'expiring' | 'expired'
  daysLeft: number
  validUntil: string
  accounts: Array<{ id: string; label: string; currency?: string }>
  reconnectSuggested: boolean
  lastSyncAt: string | null
  lastSyncTo: string | null
  /** How far back older history has been fetched, and why it stopped (if it has) */
  history: {
    status: 'pending' | 'done' | 'blocked'
    reason: string | null
    oldest: string | null
  }
  createdAt: string
}
interface SyncResult {
  transactions: RawTransaction[]
  from: string
  to: string
  count: number
}
interface AdminCheck {
  id: string
  ok: boolean
  warn?: boolean
  label: string
  detail: string
}
interface AdminOverview {
  provider: string
  connections: {
    total: number
    active: number
    expiring: number
    expired: number
  }
  syncs30d: { ok: number; failed: number; total: number }
  lastSuccessfulSync: { at: string; bank: string } | null
  checks: AdminCheck[]
}

type BankingErrorCode = 'expired' | 'throttled' | 'unavailable' | 'unauthorized' | 'unknown'
export class BankingError extends Error {
  constructor(
    public readonly code: BankingErrorCode,
    message: string,
  ) {
    super(message)
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  const method = init.method ?? 'GET'
  const mutating = method !== 'GET'

  try {
    res = await fetch(`${API_BASE}/banking${path}`, {
      ...init,
      headers: {
        ...(init.body || mutating ? getHeaders(Boolean(init.body)) : {}),
        ...init.headers,
      },
      credentials: 'same-origin',
    })
  } catch {
    throw new BankingError('unavailable', "Couldn't reach FinKit's server.")
  }
  const body = await res.json().catch(() => ({}))

  if (res.ok) {
    return body as T
  }
  const msg = typeof body.error === 'string' ? body.error : ''

  if (res.status === 401 || res.status === 403) {
    throw new BankingError('unauthorized', 'You are not signed in.')
  }
  if (res.status === 409 || msg === 'expired') {
    throw new BankingError('expired', 'Access to this bank has ended.')
  }
  if (msg === 'too_large') {
    throw new BankingError('unknown', 'That range has too many transactions. Pick a shorter range and sync again.')
  }
  if (res.status === 429) {
    throw new BankingError('throttled', msg || 'Please wait a minute before syncing again.')
  }
  // A server error with our usual { error } body means the bank had a problem. Without one, FinKit's own server (or the proxy in front of it) is down.
  if (res.status >= 500) {
    throw new BankingError(
      'unavailable',
      msg
        ? "The bank didn't respond. Try again in a few minutes."
        : "Couldn't reach FinKit's server. Try again in a moment.",
    )
  }
  throw new BankingError('unknown', msg || 'Something went wrong.')
}

// Off, unreachable or not signed in all look the same to the app: banking is simply not shown
export async function getBankingStatus(): Promise<BankingStatus> {
  try {
    const res = await fetch(`${API_BASE}/banking/status`, {
      credentials: 'same-origin',
    })

    if (!res.ok) {
      return { enabled: false }
    }

    return await res.json()
  } catch {
    return { enabled: false }
  }
}

export const listBanks = (country = 'DE') => call<{ banks: BankInfo[] }>(`/banks?country=${country}`).then(r => r.banks)
export const startConnect = (bank: string, country = 'DE', reconnect?: string) =>
  call<{ url: string }>('/connect', {
    method: 'POST',
    body: JSON.stringify({ bank, country, reconnect }),
  }).then(r => r.url)
export const listConnections = () => call<{ connections: BankConnection[] }>('/connections').then(r => r.connections)
export const syncConnection = (id: string, range: { from?: string; to?: string } = {}) =>
  call<SyncResult>(`/connections/${id}/sync`, {
    method: 'POST',
    body: JSON.stringify(range),
  })
/** Everything the server has kept for the signed-in user (scheduled and manual syncs). */
export type StoredTransaction = RawTransaction & {
  ref: string
  tripId: string | null
}
export const storedTransactions = () => call<{ transactions: StoredTransaction[]; count: number }>('/transactions')
export interface AccountBalance {
  connectionId: string
  bank: string
  /** The account's derived id, never the bank's own */
  account: string
  label: string
  currency: string
  /** Negative when overdrawn */
  amount: number
  fetchedAt: string
}
/** What each connected account held when its bank was last asked (when you press Sync). */
export const listBalances = () => call<{ balances: AccountBalance[] }>('/balances').then(r => r.balances)
export const deleteStoredTransactions = () => call<{ deleted: number }>('/transactions', { method: 'DELETE' })
export const disconnectBank = (id: string) => call<{ ok: true }>(`/connections/${id}`, { method: 'DELETE' })

export const adminOverview = () => call<AdminOverview>('/admin/overview')
export const adminSyncLog = () =>
  call<{ entries: Array<Record<string, string | number | null>> }>('/admin/sync-log').then(r => r.entries)
export const adminAudit = () =>
  call<{ entries: Array<Record<string, string | null>> }>('/admin/audit').then(r => r.entries)
export const adminExpire = (id: string, mode: 'expiring' | 'expired') =>
  call<{ ok: true }>(`/admin/connections/${id}/expire?mode=${mode}`, {
    method: 'POST',
  })

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) {
    return 'Never'
  }
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)

  if (s < SECONDS_PER_MINUTE) {
    return 'Just now'
  }
  if (s < SECONDS_PER_HOUR) {
    return `${Math.floor(s / SECONDS_PER_MINUTE)} min ago`
  }
  if (s < SECONDS_PER_DAY) {
    const hours = Math.floor(s / SECONDS_PER_HOUR)

    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (s < TIME_AGO_YESTERDAY_SECONDS) {
    return 'Yesterday'
  }

  return `${Math.floor(s / SECONDS_PER_DAY)} days ago`
}
