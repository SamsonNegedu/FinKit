import { describe, it, expect } from 'vitest'
import { createVerify, generateKeyPairSync } from 'node:crypto'
import { ProviderError } from './bank-provider'
import { EnableBankingProvider, mapEbTransaction, signJwt } from './enable-banking.provider'
import { ENABLE_BANKING_JWT_TTL_SECONDS } from '../constants'

describe('mapper', () => {
  const tx = (o: object) =>
    ({
      transaction_amount: { amount: '12.50', currency: 'EUR' },
      credit_debit_indicator: 'DBIT',
      status: 'BOOK',
      booking_date: '2026-10-05',
      ...o,
    }) as never

  it('makes debits negative and uses the creditor as recipient', () => {
    const m = mapEbTransaction(
      tx({
        creditor: { name: 'REWE' },
        remittance_information: ['Einkauf', '123'],
        entry_reference: 'r1',
      }),
      'acc',
    )!

    expect(m).toMatchObject({
      amount: -12.5,
      recipient: 'REWE',
      description: 'Einkauf 123',
      externalId: 'acc:r1',
      date: '2026-10-05',
    })
  })
  it('keeps credits positive and uses the debtor', () => {
    expect(mapEbTransaction(tx({ credit_debit_indicator: 'CRDT', debtor: { name: 'Acme' } }), 'a')).toMatchObject({
      amount: 12.5,
      recipient: 'Acme',
    })
  })
  it('skips pending transactions and rows without a date or amount', () => {
    expect(mapEbTransaction(tx({ status: 'PDNG' }), 'a')).toBeNull()
    expect(mapEbTransaction(tx({ booking_date: null }), 'a')).toBeNull()
    expect(mapEbTransaction(tx({ transaction_amount: { amount: 'x', currency: 'EUR' } }), 'a')).toBeNull()
  })

  describe('bank-to-bank differences', () => {
    it('card payment: no counterparty, merchant only in the remittance text', () => {
      expect(
        mapEbTransaction(
          tx({ remittance_information: ['KARTENZAHLUNG REWE SAGT DANKE 4711', null, ''], transaction_id: 't9' }),
          'a',
        ),
      ).toMatchObject({
        description: 'KARTENZAHLUNG REWE SAGT DANKE 4711',
        recipient: undefined,
        externalId: 'a:t9',
      })
    })
    it('falls back to note, then counterparty name, then empty description', () => {
      expect(mapEbTransaction(tx({ note: 'Miete Okt', creditor: { name: 'Vermieter' } }), 'a')!.description).toBe(
        'Miete Okt',
      )
      expect(mapEbTransaction(tx({ creditor: { name: 'Vermieter' } }), 'a')!.description).toBe('Vermieter')
      expect(mapEbTransaction(tx({}), 'a')).toMatchObject({ description: '', recipient: undefined })
    })
    it('uses value or transaction date when booking date is missing, and trims timestamps', () => {
      expect(mapEbTransaction(tx({ booking_date: null, value_date: '2026-10-07' }), 'a')!.date).toBe('2026-10-07')
      expect(mapEbTransaction(tx({ booking_date: '2026-10-06T00:00:00Z' }), 'a')!.date).toBe('2026-10-06')
    })
    it('signs by indicator even when the bank sends a signed amount', () => {
      const neg = { amount: '-12.50', currency: 'EUR' }

      expect(mapEbTransaction(tx({ transaction_amount: neg }), 'a')!.amount).toBe(-12.5)
      expect(mapEbTransaction(tx({ transaction_amount: neg, credit_debit_indicator: 'CRDT' }), 'a')!.amount).toBe(12.5)
    })
    it('has no externalId when the bank gives no reference at all', () => {
      expect(mapEbTransaction(tx({}), 'a')!.externalId).toBeUndefined()
    })
    it('takes the counterparty IBAN from the right side', () => {
      expect(
        mapEbTransaction(tx({ creditor_account: { iban: 'DE01' }, debtor_account: { iban: 'DE02' } }), 'a')!
          .recipientIban,
      ).toBe('DE01')
    })
    it('keeps non-EUR currencies', () => {
      expect(mapEbTransaction(tx({ transaction_amount: { amount: '5', currency: 'USD' } }), 'a')!.currency).toBe('USD')
    })
  })
})

describe('Enable Banking client (fake server)', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  })
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

  it('signs RS256 JWTs the API will accept', () => {
    const t = signJwt('app-123', pem, 1000, ENABLE_BANKING_JWT_TTL_SECONDS)
    const [h, p, s] = t.split('.')

    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({
      typ: 'JWT',
      alg: 'RS256',
      kid: 'app-123',
    })
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toEqual({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: 1000,
      exp: 4600,
    })
    expect(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true)
  })

  function fake(
    handler: (req: { method: string; path: string; body: any; auth: string | null }) => {
      status?: number
      body?: unknown
    },
  ) {
    const calls: Array<{
      method: string
      path: string
      body: any
      auth: string | null
    }> = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      const u = new URL(url)
      const req = {
        method: init.method || 'GET',
        path: u.pathname + u.search,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        auth: (init.headers as Record<string, string>).Authorization || null,
      }

      calls.push(req)
      const r = handler(req)

      return new Response(JSON.stringify(r.body ?? {}), {
        status: r.status ?? 200,
      })
    }) as unknown as typeof fetch

    return {
      provider: new EnableBankingProvider({
        appId: 'app',
        privateKey: pem,
        fetchImpl,
      }),
      calls,
    }
  }

  it('lists personal-account banks with their consent length', async () => {
    const { provider, calls } = fake(() => ({
      body: {
        aspsps: [
          {
            name: 'N26',
            country: 'DE',
            psu_types: ['business', 'personal'],
            maximum_consent_validity: 15552000,
          },
          { name: 'BizOnly', country: 'DE', psu_types: ['business'] },
        ],
      },
    }))

    expect(await provider.listBanks('de')).toEqual([{ name: 'N26', country: 'DE', maxConsentDays: 180 }])
    expect(calls[0].path).toBe('/aspsps?country=DE')
  })
  it('starts and completes authorisation', async () => {
    const { provider, calls } = fake(r =>
      r.path === '/auth'
        ? { body: { url: 'https://bank/login' } }
        : {
            body: {
              session_id: 'S1',
              accounts: [
                {
                  uid: 'u1',
                  identification_hash: 'h1',
                  account_id: { iban: 'DE001234' },
                  currency: 'EUR',
                },
              ],
              access: { valid_until: '2027-01-01T00:00:00Z' },
            },
          },
    )
    const { url } = await provider.startAuth({
      bank: { name: 'N26', country: 'DE', maxConsentDays: 180 },
      redirectUrl: 'https://x/cb',
      state: 'st',
      validUntil: new Date('2027-01-01'),
    })

    expect(url).toBe('https://bank/login')
    expect(calls[0].body).toMatchObject({
      aspsp: { name: 'N26', country: 'DE' },
      state: 'st',
      redirect_url: 'https://x/cb',
      psu_type: 'personal',
    })
    expect(calls[0]).toBeDefined()
    const s = await provider.completeAuth('code1')

    expect(calls[1].body).toEqual({ code: 'code1' })
    expect(s).toMatchObject({
      sessionId: 'S1',
      validUntil: '2027-01-01T00:00:00Z',
      accounts: [{ uid: 'u1', stableId: 'h1', label: '…1234', currency: 'EUR', iban: 'DE001234' }],
    })
  })
  it('fails instead of quietly cutting the list short when the bank never stops paging', async () => {
    const { provider } = fake(() => ({
      body: {
        continuation_key: 'more',
        transactions: [],
      },
    }))

    await expect(
      provider.fetchTransactions({
        session: { sessionId: 'S', accounts: [], validUntil: '' },
        account: { uid: 'u1', stableId: 'h1', label: '' },
        from: '2020-01-01',
        to: '2026-10-31',
      }),
    ).rejects.toMatchObject({ kind: 'too_large' })
  })
  it('follows continuation keys and skips pending rows', async () => {
    const { provider, calls } = fake(r =>
      r.path.includes('continuation_key=k2')
        ? {
            body: {
              transactions: [
                {
                  transaction_amount: { amount: '1', currency: 'EUR' },
                  credit_debit_indicator: 'DBIT',
                  status: 'BOOK',
                  booking_date: '2026-10-02',
                  entry_reference: 'b',
                },
              ],
            },
          }
        : {
            body: {
              continuation_key: 'k2',
              transactions: [
                {
                  transaction_amount: { amount: '2', currency: 'EUR' },
                  credit_debit_indicator: 'DBIT',
                  status: 'BOOK',
                  booking_date: '2026-10-01',
                  entry_reference: 'a',
                },
                {
                  transaction_amount: { amount: '3', currency: 'EUR' },
                  credit_debit_indicator: 'DBIT',
                  status: 'PDNG',
                  booking_date: '2026-10-01',
                },
              ],
            },
          },
    )
    const out = await provider.fetchTransactions({
      session: { sessionId: 'S', accounts: [], validUntil: '' },
      account: { uid: 'u1', stableId: 'h1', label: '', iban: 'DE001234' },
      from: '2026-10-01',
      to: '2026-10-31',
    })

    expect(out.map(t => t.externalId)).toEqual(['h1:a', 'h1:b'])
    expect(out.every(t => t.referenceAccount === 'DE001234')).toBe(true)
    expect(calls).toHaveLength(2)
    expect(calls[0].path).toContain('date_from=2026-10-01')
    expect(calls[0].path).toContain('date_to=2026-10-31')
  })
  it('sends the signed token and maps failures to clear kinds', async () => {
    for (const [status, kind] of [
      [401, 'consent_expired'],
      [429, 'rate_limited'],
      [503, 'unavailable'],
      [400, 'rejected'],
    ] as const) {
      const { provider, calls } = fake(() => ({
        status,
        body: { secret: 'must-not-leak' },
      }))
      const err = (await provider.listBanks('DE').catch(e => e)) as ProviderError

      expect(err.kind).toBe(kind)
      expect(err.message).not.toContain('must-not-leak')
      expect(calls[0].auth).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/)
    }
  })
})
