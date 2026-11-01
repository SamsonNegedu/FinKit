import { createSign } from 'node:crypto'
import {
  BankInfo,
  BankProvider,
  BankTransaction,
  ProviderAccount,
  ProviderError,
  ProviderSession,
} from '../bank-provider'

// ---------------- transaction mapping ----------------
// Shape of an Enable Banking transaction (only the fields we use)
interface EbTransaction {
  entry_reference?: string | null
  transaction_id?: string | null
  transaction_amount: { amount: string; currency: string }
  credit_debit_indicator: 'CRDT' | 'DBIT'
  status?: string
  booking_date?: string | null
  value_date?: string | null
  transaction_date?: string | null
  creditor?: { name?: string | null } | null
  debtor?: { name?: string | null } | null
  creditor_account?: { iban?: string | null } | null
  debtor_account?: { iban?: string | null } | null
  remittance_information?: string[] | null
  note?: string | null
}

/** Booked transactions only: pending ones can change or disappear. */
export function mapEbTransaction(tx: EbTransaction, accountStableId: string): BankTransaction | null {
  if (tx.status && tx.status !== 'BOOK') return null
  const date = tx.booking_date || tx.value_date || tx.transaction_date
  const raw = Number(tx.transaction_amount?.amount)
  if (!date || !Number.isFinite(raw)) return null

  const debit = tx.credit_debit_indicator === 'DBIT'
  const counterparty = debit ? tx.creditor : tx.debtor
  const counterpartyAccount = debit ? tx.creditor_account : tx.debtor_account
  const remittance = (tx.remittance_information || []).filter(Boolean).join(' ').trim()
  const ref = tx.entry_reference || tx.transaction_id || undefined

  return {
    date: date.slice(0, 10),
    description: remittance || tx.note || counterparty?.name || '',
    amount: debit ? -Math.abs(raw) : Math.abs(raw),
    currency: tx.transaction_amount.currency,
    recipient: counterparty?.name || undefined,
    recipientIban: counterpartyAccount?.iban || undefined,
    // Stable across syncs AND reconnects, so re-fetching the same day never duplicates
    externalId: ref ? `${accountStableId}:${ref}` : undefined,
    accountId: accountStableId,
    rawData: { source: 'enablebanking' },
  }
}

// ---------------- API client ----------------
// Client for the Enable Banking API (https://enablebanking.com/docs/api/reference/).
// Requests are signed with the application's RSA private key (RS256 JWT). The key never leaves
// this process, is never logged, and is never sent to the browser.
//
// Built from their documentation. Exercised in tests against a fake server, but not yet against
// the live API.

const BASE_URL = 'https://api.enablebanking.com'
const MAX_PAGES = 50

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url')

export function signJwt(
  appId: string,
  privateKeyPem: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = 3600,
): string {
  const header = { typ: 'JWT', alg: 'RS256', kid: appId }
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  }
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKeyPem)
  return `${unsigned}.${b64url(signature)}`
}

interface EbAccount {
  uid: string
  identification_hash?: string
  account_id?: { iban?: string | null } | null
  currency?: string | null
  name?: string | null
}

export class EnableBankingProvider implements BankProvider {
  readonly name = 'enablebanking' as const
  private cachedJwt: { token: string; expires: number } | null = null

  constructor(
    private readonly opts: { appId: string; privateKey: string; baseUrl?: string; fetchImpl?: typeof fetch },
  ) {}

  private jwt(): string {
    const now = Math.floor(Date.now() / 1000)
    if (this.cachedJwt && this.cachedJwt.expires - 60 > now) return this.cachedJwt.token
    const token = signJwt(this.opts.appId, this.opts.privateKey, now, 3600)
    this.cachedJwt = { token, expires: now + 3600 }
    return token
  }

  private async api<T>(method: string, path: string, body?: unknown): Promise<T> {
    const doFetch = this.opts.fetchImpl ?? fetch
    let res: Response
    try {
      res = await doFetch(`${this.opts.baseUrl ?? BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.jwt()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      })
    } catch {
      throw new ProviderError('Could not reach the bank service', 'unavailable')
    }
    if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T
    // Keep error detail short and free of anything sensitive
    const kind =
      res.status === 429
        ? 'rate_limited'
        : res.status === 401 || res.status === 403 || res.status === 404
          ? 'consent_expired'
          : res.status >= 500
            ? 'unavailable'
            : 'rejected'
    throw new ProviderError(`Bank service returned ${res.status}`, kind, res.status)
  }

  async listBanks(country: string): Promise<BankInfo[]> {
    const data = await this.api<{
      aspsps: Array<{ name: string; country: string; psu_types?: string[]; maximum_consent_validity?: number }>
    }>('GET', `/aspsps?country=${encodeURIComponent(country.toUpperCase())}`)
    return (data.aspsps || [])
      .filter(a => !a.psu_types || a.psu_types.includes('personal'))
      .map(a => ({
        name: a.name,
        country: a.country,
        maxConsentDays: Math.floor((a.maximum_consent_validity ?? 90 * 86400) / 86400),
      }))
      .toSorted((a, b) => a.name.localeCompare(b.name))
  }

  async startAuth(p: { bank: BankInfo; redirectUrl: string; state: string; validUntil: Date }) {
    const data = await this.api<{ url: string }>('POST', '/auth', {
      access: { valid_until: p.validUntil.toISOString() },
      aspsp: { name: p.bank.name, country: p.bank.country },
      state: p.state,
      redirect_url: p.redirectUrl,
      psu_type: 'personal',
    })
    return { url: data.url }
  }

  async completeAuth(code: string): Promise<ProviderSession> {
    const data = await this.api<{ session_id: string; accounts: EbAccount[]; access?: { valid_until?: string } }>(
      'POST',
      '/sessions',
      { code },
    )
    const accounts: ProviderAccount[] = (data.accounts || []).map(a => {
      const iban = a.account_id?.iban || ''
      return {
        uid: a.uid,
        stableId: a.identification_hash || iban || a.uid,
        label: iban ? `…${iban.slice(-4)}` : a.name || 'Account',
        currency: a.currency || undefined,
      }
    })
    return {
      sessionId: data.session_id,
      accounts,
      validUntil: data.access?.valid_until || new Date(Date.now() + 90 * 86400_000).toISOString(),
    }
  }

  async fetchTransactions(p: {
    session: ProviderSession
    account: ProviderAccount
    from: string
    to: string
  }): Promise<BankTransaction[]> {
    const out: BankTransaction[] = []
    let key: string | undefined
    for (let page = 0; page < MAX_PAGES; page++) {
      const qs = new URLSearchParams({ date_from: p.from, date_to: p.to })
      if (key) qs.set('continuation_key', key)
      const data = await this.api<{ transactions?: EbTransaction[]; continuation_key?: string | null }>(
        'GET',
        `/accounts/${encodeURIComponent(p.account.uid)}/transactions?${qs}`,
      )
      for (const tx of data.transactions || []) {
        const mapped = mapEbTransaction(tx, p.account.stableId)
        if (mapped) out.push(mapped)
      }
      key = data.continuation_key || undefined
      if (!key) break
    }
    return out
  }

  async revoke(sessionId: string): Promise<void> {
    try {
      await this.api('DELETE', `/sessions/${encodeURIComponent(sessionId)}`)
    } catch {
      /* best effort */
    }
  }
}
