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

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly kind: 'consent_expired' | 'rate_limited' | 'unavailable' | 'rejected' | 'too_large',
    public readonly status?: number,
  ) {
    super(message)
  }
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
  }): Promise<BankTransaction[]>
  revoke(sessionId: string): Promise<void>
}

export const BANK_PROVIDER = Symbol('BANK_PROVIDER')
