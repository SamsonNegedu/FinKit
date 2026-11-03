import { createSign } from 'node:crypto'
import {
  DEFAULT_CONSENT_DAYS,
  DEFAULT_CONSENT_VALIDITY_SECONDS,
  ENABLE_BANKING_JWT_REFRESH_BUFFER_SECONDS,
  ENABLE_BANKING_JWT_TTL_SECONDS,
  ENABLE_BANKING_MAX_TRANSACTION_PAGES,
  ENABLE_BANKING_REQUEST_TIMEOUT_MS,
} from '../constants'
import { isoDaysFromNow, SECONDS_PER_DAY } from '../../shared/constants/time'
import {
  BankInfo,
  BankProvider,
  BankTransaction,
  ProviderAccount,
  ProviderBalance,
  ProviderError,
  ProviderSession,
  PsuInfo,
} from './bank-provider'
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
  if (tx.status && tx.status !== 'BOOK') {
    return null
  }
  const date = tx.booking_date || tx.value_date || tx.transaction_date
  const raw = Number(tx.transaction_amount?.amount)

  if (!date || !Number.isFinite(raw)) {
    return null
  }

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

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url')

export function signJwt(
  appId: string,
  privateKeyPem: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = ENABLE_BANKING_JWT_TTL_SECONDS,
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
    private readonly opts: {
      appId: string
      privateKey: string
      baseUrl?: string
      fetchImpl?: typeof fetch
    },
  ) {}

  private jwt(): string {
    const now = Math.floor(Date.now() / 1000)

    if (this.cachedJwt && this.cachedJwt.expires - ENABLE_BANKING_JWT_REFRESH_BUFFER_SECONDS > now) {
      return this.cachedJwt.token
    }
    const token = signJwt(this.opts.appId, this.opts.privateKey, now, ENABLE_BANKING_JWT_TTL_SECONDS)

    this.cachedJwt = { token, expires: now + ENABLE_BANKING_JWT_TTL_SECONDS }

    return token
  }

  private async api<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const doFetch = this.opts.fetchImpl ?? fetch
    let token: string
    let res: Response

    // Signing is separate from the request so a malformed private key isn't reported as a network failure
    try {
      token = this.jwt()
    } catch {
      throw new ProviderError('Could not sign the bank service token (check EB_PRIVATE_KEY)', 'unavailable')
    }
    try {
      res = await doFetch(`${this.opts.baseUrl ?? BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...extraHeaders,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(ENABLE_BANKING_REQUEST_TIMEOUT_MS),
      })
    } catch {
      throw new ProviderError('Could not reach the bank service', 'unavailable')
    }
    if (res.ok) {
      return (res.status === 204 ? undefined : await res.json()) as T
    }
    // Keep error detail short and free of anything sensitive
    const kind =
      res.status === 429
        ? 'rate_limited'
        : res.status === 401 || res.status === 403 || res.status === 404
          ? 'consent_expired'
          : res.status >= 500
            ? 'unavailable'
            : 'rejected'

    const retryAfter = Number(res.headers.get('retry-after'))

    throw new ProviderError(
      `Bank service returned ${res.status}`,
      kind,
      res.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    )
  }

  async listBanks(country: string): Promise<BankInfo[]> {
    const data = await this.api<{
      aspsps: Array<{
        name: string
        country: string
        psu_types?: string[]
        maximum_consent_validity?: number
        required_psu_headers?: string[]
      }>
    }>('GET', `/aspsps?country=${encodeURIComponent(country.toUpperCase())}`)

    return (data.aspsps || [])
      .filter(a => !a.psu_types || a.psu_types.includes('personal'))
      .map(a => ({
        name: a.name,
        country: a.country,
        maxConsentDays: Math.floor((a.maximum_consent_validity ?? DEFAULT_CONSENT_VALIDITY_SECONDS) / SECONDS_PER_DAY),
        requiredPsuHeaders: a.required_psu_headers?.length ? a.required_psu_headers : undefined,
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
    const data = await this.api<{
      session_id: string
      accounts: EbAccount[]
      access?: { valid_until?: string }
    }>('POST', '/sessions', { code })
    const accounts: ProviderAccount[] = (data.accounts || []).map(a => {
      const iban = a.account_id?.iban || ''

      return {
        uid: a.uid,
        stableId: a.identification_hash || iban || a.uid,
        label: iban ? `…${iban.slice(-4)}` : a.name || 'Account',
        currency: a.currency || undefined,
        iban: iban || undefined,
      }
    })

    return {
      sessionId: data.session_id,
      accounts,
      validUntil: data.access?.valid_until || isoDaysFromNow(DEFAULT_CONSENT_DAYS),
    }
  }

  async fetchTransactions(p: {
    session: ProviderSession
    account: ProviderAccount
    from: string
    to: string
    psu?: PsuInfo
    longest?: boolean
    beforeRequest?: () => Promise<void>
  }): Promise<BankTransaction[]> {
    const headers = psuHeaders(p.session.requiredPsuHeaders, p.psu)
    const window = () => new URLSearchParams({ date_from: p.from, date_to: p.to })

    if (!p.longest) {
      return this.collect(p.account, window(), headers, p.beforeRequest)
    }
    try {
      return await this.collect(p.account, new URLSearchParams({ strategy: 'longest' }), headers, p.beforeRequest)
    } catch (e) {
      // Not every bank can do this: fall back to the normal window
      if (e instanceof ProviderError && e.kind === 'rejected') {
        return this.collect(p.account, window(), headers, p.beforeRequest)
      }
      throw e
    }
  }

  /** Follows the bank's pages until it says there are no more. */
  private async collect(
    account: ProviderAccount,
    base: URLSearchParams,
    headers: Record<string, string>,
    beforeRequest?: () => Promise<void>,
  ): Promise<BankTransaction[]> {
    const out: BankTransaction[] = []
    let key: string | undefined

    for (let page = 0; page < ENABLE_BANKING_MAX_TRANSACTION_PAGES; page++) {
      const qs = new URLSearchParams(base)

      if (key) {
        qs.set('continuation_key', key)
      }
      await beforeRequest?.()
      const data = await this.api<{
        transactions?: EbTransaction[]
        continuation_key?: string | null
      }>('GET', `/accounts/${encodeURIComponent(account.uid)}/transactions?${qs}`, undefined, headers)

      for (const tx of data.transactions || []) {
        const mapped = mapEbTransaction(tx, account.stableId)

        if (mapped) {
          mapped.referenceAccount = account.iban
          out.push(mapped)
        }
      }
      key = data.continuation_key || undefined
      if (!key) {
        return out
      }
    }

    throw new ProviderError('Too many transactions in this date range', 'too_large')
  }

  async fetchBalance(p: {
    session: ProviderSession
    account: ProviderAccount
    psu?: PsuInfo
    beforeRequest?: () => Promise<void>
  }): Promise<ProviderBalance | null> {
    await p.beforeRequest?.()
    const data = await this.api<{ balances?: EbBalance[] }>(
      'GET',
      `/accounts/${encodeURIComponent(p.account.uid)}/balances`,
      undefined,
      psuHeaders(p.session.requiredPsuHeaders, p.psu),
    )

    return pickBalance(data.balances ?? [])
  }

  async revoke(sessionId: string): Promise<void> {
    try {
      await this.api('DELETE', `/sessions/${encodeURIComponent(sessionId)}`)
    } catch {
      /* best effort */
    }
  }
}

export interface EbBalance {
  balance_amount?: { amount?: string; currency?: string }
  balance_type?: string
  credit_debit_indicator?: 'CRDT' | 'DBIT'
  reference_date?: string
}

// What "how much do I have" means, best first: the balance including today's booked movements, then the last closing
// balance, then what is available to spend, then the expected one.
const BALANCE_PREFERENCE = ['ITBD', 'CLBD', 'ITAV', 'CLAV', 'XPCD', 'OPBD']

/** The one balance worth showing from everything a bank sends; null when none is usable. */
export function pickBalance(balances: EbBalance[]): ProviderBalance | null {
  const usable = balances.filter(b => b.balance_amount?.currency && Number.isFinite(Number(b.balance_amount.amount)))
  const rank = (b: EbBalance) => {
    const i = BALANCE_PREFERENCE.indexOf(b.balance_type ?? '')

    return i === -1 ? BALANCE_PREFERENCE.length : i
  }
  const best = usable.toSorted((a, b) => rank(a) - rank(b))[0]

  if (!best) {
    return null
  }
  const amount = Number(best.balance_amount!.amount)

  return {
    amount: best.credit_debit_indicator === 'DBIT' ? -Math.abs(amount) : amount,
    currency: best.balance_amount!.currency!,
    type: best.balance_type,
    asOf: best.reference_date,
  }
}

/**
 * Banks list the headers that tell them "a person is here" (all or none, or the bank answers 422).
 * We can honestly supply the person's IP address and browser; if the bank wants anything else, or
 * nobody asked for this fetch, send none and the request counts as a background one.
 */
function psuHeaders(required: string[] | undefined, psu: PsuInfo | undefined): Record<string, string> {
  if (!psu || !required?.length) {
    return {}
  }
  const have: Record<string, string | undefined> = { 'psu-ip-address': psu.ip, 'psu-user-agent': psu.userAgent }

  if (!required.every(name => have[name.toLowerCase()])) {
    return {}
  }

  return Object.fromEntries(
    [
      ['Psu-Ip-Address', psu.ip],
      ['Psu-User-Agent', psu.userAgent],
    ].filter((entry): entry is [string, string] => !!entry[1]),
  )
}
