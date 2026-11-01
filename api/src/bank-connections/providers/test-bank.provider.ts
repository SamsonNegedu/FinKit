import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { MS_PER_DAY, isoDaysFromNow } from '../../shared/constants/time'
import { TEST_BANK_DEFAULT_CONSENT_DAYS, TEST_BANK_MAX_MOCK_HISTORY_DAYS } from '../constants'
import {
  BankInfo,
  BankProvider,
  BankTransaction,
  ProviderAccount,
  ProviderError,
  ProviderSession,
} from './bank-provider'

// The test bank: a fake bank for development and tests. It has its own approval page (served by the banking
// routes), deterministic transactions, and a few "bad" banks to exercise error states.
// It is refused at startup in production (see config.ts).

const TEST_BANKS: BankInfo[] = [
  { name: 'N26', country: 'DE', maxConsentDays: 180 },
  { name: 'Wise', country: 'DE', maxConsentDays: 180 },
  { name: 'Revolut', country: 'DE', maxConsentDays: 180 },
  { name: 'Test Bank (always denies)', country: 'DE', maxConsentDays: 180 },
  { name: 'Test Bank (sync fails)', country: 'DE', maxConsentDays: 180 },
]

// Small seeded PRNG so the same account and day always yield the same transactions
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hash(s: string): number {
  let h = 2166136261

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  return h >>> 0
}

const SPEND: Array<[string, string, number, number]> = [
  ['REWE Markt', 'REWE Einkauf', 12, 70],
  ['Shell', 'Fuel', 30, 60],
  ['Trainline', 'Trainline.com ticket', 20, 90],
  ['Amazon', 'Amazon order', 8, 120],
  ['Cafe Central', 'Coffee', 3, 9],
  ['Lidl', 'Lidl Einkauf', 8, 45],
  ['DeepSeek', 'DeepSeek API credits', 5, 25],
]

function dayList(from: string, to: string): string[] {
  const start = new Date(from + 'T00:00:00Z').getTime()
  const days = Math.min(
    Math.floor((new Date(to + 'T00:00:00Z').getTime() - start) / MS_PER_DAY) + 1,
    TEST_BANK_MAX_MOCK_HISTORY_DAYS,
  )

  return Array.from({ length: Math.max(days, 0) }, (_, i) =>
    new Date(start + i * MS_PER_DAY).toISOString().slice(0, 10),
  )
}

@Injectable()
export class TestBankProvider implements BankProvider {
  readonly name = 'mock' as const
  private pending = new Map<string, { redirectUrl: string; bank: BankInfo }>() // state -> request
  private codes = new Map<string, BankInfo>() // code -> bank

  async listBanks(country: string) {
    return TEST_BANKS.filter(b => b.country === country.toUpperCase())
  }

  async startAuth(p: { bank: BankInfo; redirectUrl: string; state: string; validUntil: Date }) {
    this.pending.set(p.state, { redirectUrl: p.redirectUrl, bank: p.bank })

    return {
      url: `/api/banking/mock-bank?state=${encodeURIComponent(p.state)}`,
    }
  }

  // ---- used by the mock bank pages ----
  pendingFor(state: string) {
    return this.pending.get(state)
  }

  decide(state: string, approve: boolean): string | null {
    const req = this.pending.get(state)

    if (!req) {
      return null
    }
    this.pending.delete(state)
    const sep = req.redirectUrl.includes('?') ? '&' : '?'

    if (!approve || req.bank.name.includes('always denies')) {
      return `${req.redirectUrl}${sep}error=access_denied&state=${encodeURIComponent(state)}`
    }
    const code = randomBytes(12).toString('hex')

    this.codes.set(code, req.bank)

    return `${req.redirectUrl}${sep}code=${code}&state=${encodeURIComponent(state)}`
  }

  async completeAuth(code: string): Promise<ProviderSession> {
    const bank = this.codes.get(code)

    if (!bank) {
      throw new ProviderError('Unknown code', 'rejected', 400)
    }
    this.codes.delete(code)
    const slug = bank.name.replace(/\W+/g, '').toLowerCase()
    const accounts: ProviderAccount[] =
      bank.name === 'Wise'
        ? [
            {
              uid: `${slug}-usd-${randomBytes(3).toString('hex')}`,
              stableId: `${slug}-usd`,
              label: '…0377',
              currency: 'USD',
              iban: 'DE02120300000000000377',
            },
            {
              uid: `${slug}-eur-${randomBytes(3).toString('hex')}`,
              stableId: `${slug}-eur`,
              label: '…4410',
              currency: 'EUR',
              iban: 'DE02120300000000004410',
            },
          ]
        : [
            {
              uid: `${slug}-main-${randomBytes(3).toString('hex')}`,
              stableId: `${slug}-main`,
              label: '…4821',
              currency: 'EUR',
              iban: 'DE02120300000000004821',
            },
          ]

    return {
      sessionId: `mock-${randomBytes(8).toString('hex')}`,
      accounts,
      validUntil: isoDaysFromNow(TEST_BANK_DEFAULT_CONSENT_DAYS),
    }
  }

  async fetchTransactions(p: {
    session: ProviderSession
    account: ProviderAccount
    from: string
    to: string
  }): Promise<BankTransaction[]> {
    if (p.session.sessionId.includes('fail')) {
      throw new ProviderError('Bank unavailable', 'unavailable', 503)
    }
    const out: BankTransaction[] = []

    for (const day of dayList(p.from, p.to)) {
      const rnd = mulberry32(hash(p.account.stableId + day))
      const dom = Number(day.slice(8, 10))
      const add = (desc: string, who: string, amount: number, i: number) =>
        out.push({
          date: day,
          description: desc,
          amount: Math.round(amount * 100) / 100,
          currency: p.account.currency || 'EUR',
          recipient: who,
          externalId: `${p.account.stableId}:${day}:${i}`,
          accountId: p.account.stableId,
          rawData: { source: 'mock' },
        })

      if (dom === 1) {
        add('Salary', 'Acme GmbH', 2800, 0)
      }
      if (dom === 5) {
        add('Netflix subscription', 'Netflix', -9.99, 1)
      }
      if (rnd() < 0.55) {
        const [who, desc, lo, hi] = SPEND[Math.floor(rnd() * SPEND.length)]

        add(desc, who, -(lo + rnd() * (hi - lo)), 2)
      }
    }

    return out
  }

  async revoke(): Promise<void> {}
}
