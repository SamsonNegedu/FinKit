// The contract every bank provider (the real one and the test bank) fulfils.

// What the rest of the API knows about bank providers. Real and mock providers both fit this.

export interface BankInfo {
  name: string
  country: string
  maxConsentDays: number
  /** Headers the bank wants (all or none) to treat a request as made by a user who is present */
  requiredPsuHeaders?: string[]
}

export interface ProviderAccount {
  uid: string // provider id, only valid for the life of a session
  stableId: string // survives reconnects (used to recognise the same transaction again)
  label: string // masked, safe to show: "…1234"
  currency?: string
  /** The account's own IBAN, so transfers between the user's accounts can be recognised. Stored encrypted. */
  iban?: string
}

export interface ProviderSession {
  sessionId: string
  accounts: ProviderAccount[]
  validUntil: string // ISO
  /** Kept from connect time: what this bank needs to see to treat a request as user-initiated */
  requiredPsuHeaders?: string[]
}

/** Who is pressing Sync, as the bank's fraud checks like to know. Never stored. */
export interface PsuInfo {
  ip?: string
  userAgent?: string
}

// Shaped like the web app's RawTransaction, so a sync feeds the normal import path
export interface BankTransaction {
  date: string // YYYY-MM-DD
  description: string
  amount: number // negative = money out
  currency: string
  recipient?: string
  recipientIban?: string
  externalId?: string
  accountId?: string
  /** The user's own account number (IBAN), when the bank gives it */
  referenceAccount?: string
  // Where it came from, so the app can browse bank → account → transactions
  bankName?: string
  accountLabel?: string
  accountRef?: string
  rawData: Record<string, string>
}

/** What an account holds right now, as the bank reports it. */
export interface ProviderBalance {
  /** Signed: negative when overdrawn */
  amount: number
  currency: string
  /** The bank's own kind of balance (booked, available...) */
  type?: string
  /** The date the bank says it is valid for */
  asOf?: string
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: 'consent_expired' | 'rate_limited' | 'unavailable' | 'rejected' | 'too_large',
    public readonly status?: number,
    /** From the bank's Retry-After on a 429: when it says we may come back */
    public readonly retryAfterSeconds?: number,
  ) {
    super(message)
  }
}

/**
 * What is safe to log about a failure. ProviderError messages are written to carry no secrets; any
 * other error might quote a token, IBAN or key in its message, so only its type is kept.
 */
export function errorSummary(err: unknown): string {
  if (err instanceof ProviderError) {
    return err.message
  }

  return err instanceof Error ? err.name : 'unknown error'
}

export interface BankProvider {
  readonly name: 'mock' | 'enablebanking'
  listBanks(country: string): Promise<BankInfo[]>
  startAuth(p: { bank: BankInfo; redirectUrl: string; state: string; validUntil: Date }): Promise<{ url: string }>
  completeAuth(code: string): Promise<ProviderSession>
  fetchTransactions(p: {
    session: ProviderSession
    account: ProviderAccount
    from: string
    to: string
    /** Present only when a person asked for this fetch (not for scheduled ones) */
    psu?: PsuInfo
    /** Ask the bank for the longest history it allows (ignores from/to), for the very first fetch */
    longest?: boolean
    /**
     * Called before every request to the bank (each page counts). It counts the request against the
     * daily budget, may wait to space requests out, and throws a ProviderError to stop the fetch.
     */
    beforeRequest?: () => Promise<void>
  }): Promise<BankTransaction[]>
  /** The account's current balance, or null when the bank gives none */
  fetchBalance(p: {
    session: ProviderSession
    account: ProviderAccount
    psu?: PsuInfo
    beforeRequest?: () => Promise<void>
  }): Promise<ProviderBalance | null>
  revoke(sessionId: string): Promise<void>
}

export const BANK_PROVIDER = Symbol('BANK_PROVIDER')
