import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, createTestApp } from '../testing/test-app'
import { DEFAULT_CONSENT_DAYS } from '../bank-connections/constants'
import { isoDaysFromNow } from '../shared/constants/time'
import { BankProvider, BankTransaction } from '../bank-connections/providers/bank-provider'
import { detectContracts, isActive } from './contracts.detector'
import { suggestCategory } from './contracts.category'

const pay = (date: string, amount: number, who: string, currency = 'EUR'): BankTransaction => ({
  date,
  description: `Lastschrift ${who}`,
  amount: -amount,
  currency,
  recipient: who,
  externalId: `${who}:${date}:${amount}`,
  rawData: {},
})
const pad = (n: number) => String(n).padStart(2, '0')
const months = (who: string, amounts: number[], start = '2026-01-03') =>
  amounts.map((a, i) => {
    const d = new Date(`${start}T00:00:00Z`)

    d.setUTCMonth(d.getUTCMonth() + i)

    return pay(d.toISOString().slice(0, 10), a, who)
  })

const MINE = new Set([
  'Rent',
  'Electricity',
  'Internet',
  'Insurance',
  'Subscriptions',
  'Public Transport',
  'Investment',
  'Savings',
  'Health & Wellbeing',
  'Car',
])
const guess = (text: string, over: Partial<Parameters<typeof suggestCategory>[0]> = {}) =>
  suggestCategory({ text, kind: 'fixed', frequency: 'monthly', amount: 100, available: MINE, ...over })?.category

describe('suggesting a category', () => {
  it('reads the name and the payment text', () => {
    expect(guess('Hausverwaltung Müller Miete 11/2026')).toBe('Rent')
    expect(guess('Vattenfall Strom Abschlag')).toBe('Electricity')
    expect(guess('DB Vertrieb GmbH Deutschlandticket')).toBe('Public Transport')
    expect(guess('Trade Republic Sparplan')).toBe('Investment')
    expect(guess('FitX Deutschland GmbH Mitgliedsbeitrag')).toBe('Health & Wellbeing')
  })

  it('only suggests what the person has, falling back to the next best', () => {
    const without = new Set(['Subscriptions', 'Rent'])

    expect(guess('FitX Deutschland GmbH', { available: without })).toBe('Subscriptions')
    expect(guess('Vattenfall Strom', { available: without })).toBeUndefined()
    expect(guess('Trade Republic Sparplan', { available: new Set(['Savings']) })).toBe('Savings')
  })

  it('falls back to the rhythm when the name says nothing', () => {
    expect(guess('Acme Holding', { frequency: 'yearly' })).toBe('Insurance')
    expect(guess('Acme Holding', { amount: 9.99 })).toBe('Subscriptions')
    expect(guess('Acme Holding', { amount: 400 })).toBeUndefined()
    expect(guess('Acme Holding', { kind: 'variable', amount: 9.99 })).toBeUndefined()
  })
})

describe('detecting contracts', () => {
  it('finds a fixed monthly payment after three months, not before', () => {
    expect(detectContracts(months('Vermieter Meier', [950, 950]))).toEqual([])
    const [rent] = detectContracts(months('Vermieter Meier', [950, 950, 950]))

    expect(rent.detected).toMatchObject({
      kind: 'fixed',
      frequency: 'monthly',
      amount: 950,
      count: 3,
      nextExpected: '2026-04-03',
    })
  })

  it('treats a bill that drifts as variable, and one that swings wildly as no contract', () => {
    expect(detectContracts(months('Stadtwerke Strom', [61, 58, 66, 70]))[0].detected.kind).toBe('variable')
    expect(detectContracts(months('Shell', [20, 90, 35, 140]))).toEqual([])
  })

  it('needs a steady rhythm: irregular dates are not a contract', () => {
    const rows = ['2026-01-02', '2026-01-20', '2026-03-29', '2026-04-04'].map(d => pay(d, 30, 'Cafe'))

    expect(detectContracts(rows)).toEqual([])
  })

  it('finds quarterly and yearly payments, and ignores income and weekly shopping', () => {
    const quarterly = ['2025-01-15', '2025-04-15', '2025-07-15', '2025-10-15'].map(d =>
      pay(d, 120, 'Allianz Versicherung'),
    )
    const yearly = ['2024-06-01', '2025-06-01'].map(d => pay(d, 240, 'ADAC'))
    const weekly = Array.from({ length: 8 }, (_, i) => pay(`2026-01-${String(1 + i * 7).padStart(2, '0')}`, 40, 'Lidl'))
    const salary = months('Acme', [3000, 3000, 3000]).map(t => ({ ...t, amount: -t.amount }))
    const found = detectContracts([...quarterly, ...yearly, ...weekly, ...salary])

    expect(found.map(f => [f.detected.name, f.detected.frequency]).toSorted()).toEqual([
      ['ADAC', 'yearly'],
      ['Allianz Versicherung', 'quarterly'],
    ])
  })

  it('does not mistake a shop visited several times a month for a contract', () => {
    const visits = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 1 + i * 3))

      return pay(d.toISOString().slice(0, 10), 5 + (i % 4), 'Cafe Central')
    })

    expect(detectContracts(visits)).toEqual([])
  })

  it('copes with what real statements look like', () => {
    // No recipient: the payee has to come from the text, wrapped in a bank prefix and a changing date
    const textOnly = ['2026-01-03', '2026-02-03', '2026-03-03', '2026-04-03'].map((d, i) => ({
      ...pay(d, 39.95, 'x'),
      recipient: undefined,
      description: `Lastschrift Telekom Deutschland GmbH Rechnung ${i + 10}.${pad(i + 1)}.2026`,
    }))
    // PayPal is only the processor: the shop is named in the text
    const viaPayPal = months('PayPal', [9.99, 9.99, 9.99, 9.99]).map(t => ({
      ...t,
      description: 'PayPal Zahlung bei Spotify AB 1234567890',
    }))
    // One month skipped, one late payment, and a refund in the middle of the series
    const bumpy = [
      pay('2026-01-02', 24.99, 'FitX'),
      pay('2026-02-02', 24.99, 'FitX'),
      pay('2026-04-09', 24.99, 'FitX'),
      pay('2026-05-02', 24.99, 'FitX'),
      { ...pay('2026-05-20', 24.99, 'FitX'), amount: 24.99 },
      pay('2026-06-02', 24.99, 'FitX'),
    ]
    const found = detectContracts([...textOnly, ...viaPayPal, ...bumpy])
    const names = found.map(f => f.detected.name).toSorted()

    expect(names).toEqual(['FitX', 'Spotify AB', 'Telekom Deutschland GmbH Rechn'])
    expect(found.find(f => f.detected.name === 'FitX')!.detected).toMatchObject({ kind: 'fixed', frequency: 'monthly' })
  })

  it('does not take a few scattered payments for a monthly contract', () => {
    const rows = ['2026-01-02', '2026-03-20', '2026-07-11', '2026-10-05'].map(d => pay(d, 30, 'Odd Shop'))

    expect(detectContracts(rows)).toEqual([])
  })

  it('does not count moves between the person’s own accounts', () => {
    const rows = months('Own savings', [500, 500, 500]).map(t => ({
      ...t,
      recipientIban: 'DE00X',
      referenceAccount: 'DE00X',
    }))

    expect(detectContracts(rows)).toEqual([])
  })

  it('calls a price that steps now and then fixed, and shows what it costs now', () => {
    const rent = [920, 920, 920, 950, 950, 950, 950, 1020, 1020, 1020]
    const [c] = detectContracts(months('Hausverwaltung', rent, '2025-01-01'))

    expect(c.detected).toMatchObject({ kind: 'fixed', amount: 1020, priceChange: { from: 950, to: 1020 } })
  })

  it('does not wait for a big price rise to settle: a fixed payment that stepped up is still found', () => {
    const [c] = detectContracts(months('Stadtwerke Strom', [50, 50, 50, 50, 50, 50, 95, 95]))

    expect(c.detected).toMatchObject({ kind: 'fixed', amount: 95, priceChange: { from: 50, to: 95 } })
    // Right after the rise, with only one new payment
    expect(detectContracts(months('Stadtwerke Strom', [50, 50, 50, 50, 50, 95]))[0].detected.amount).toBe(95)
  })

  it('follows a payee whose text changes every month by its IBAN, so a new price does not start over', () => {
    const strom = (date: string, amount: number, ref: string) => ({
      ...pay(date, amount, ''),
      recipient: undefined,
      description: `S/836670615631/${ref} Abschlag`,
      recipientIban: 'DE23420500010101191014',
      externalId: ref,
    })
    const rows = [
      ...['2026-03-08', '2026-04-08', '2026-05-07', '2026-06-08', '2026-07-30'].map((d, i) =>
        strom(d, 73, `6012${i}13901868`),
      ),
      ...['2026-09-01', '2026-10-01'].map((d, i) => strom(d, 80, `6049${i}4061623`)),
    ].map((r, i) => ({ ...r, description: `${r.description} ${i % 2 ? 'Monat' : 'Zeitraum'} ${i}x` }))
    const found = detectContracts(rows)

    expect(found).toHaveLength(1)
    expect(found[0].detected).toMatchObject({ kind: 'fixed', amount: 80, count: 7 })
  })

  it('keeps shops apart that are paid through one shared IBAN', () => {
    const via = (date: string, who: string, amount: number) => ({
      ...pay(date, amount, who),
      recipientIban: 'IE00PROCESSOR000000001',
    })
    const rows = [
      ...months('Netflix', [12, 12, 12, 12]).map(r => ({ ...r, recipientIban: 'IE00PROCESSOR000000001' })),
      ...['2026-01-09', '2026-02-09', '2026-03-09', '2026-04-09'].map(d => via(d, 'Spotify', 10)),
    ]

    expect(
      detectContracts(rows)
        .map(c => c.detected.name)
        .toSorted(),
    ).toEqual(['Netflix', 'Spotify'])
  })

  it('flags a price change, and tells an ended contract from a running one', () => {
    const [c] = detectContracts(months('Netflix', [9.99, 9.99, 9.99, 12.99]))

    expect(c.detected.priceChange).toEqual({ from: 9.99, to: 12.99 })
    expect(isActive('2026-04-03', 'monthly', '2026-05-10')).toBe(true)
    expect(isActive('2026-04-03', 'monthly', '2026-09-01')).toBe(false)
  })

  it('keeps currencies apart', () => {
    const usd = months('Cloud', [10, 10, 10]).map(t => ({ ...t, currency: 'USD' }))
    const found = detectContracts([...usd, ...months('Cloud', [10, 10, 10])])

    expect(found.map(f => f.currency).toSorted()).toEqual(['EUR', 'USD'])
  })
})

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []

afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
})

function bankWith(history: BankTransaction[]): BankProvider {
  return {
    name: 'mock',
    listBanks: async () => [{ name: 'B', country: 'DE', maxConsentDays: 180 }],
    startAuth: async p => ({ url: `/x?state=${p.state}` }),
    completeAuth: async () => ({
      sessionId: 's',
      accounts: [{ uid: 'u', stableId: 'acc', label: '…1' }],
      validUntil: isoDaysFromNow(DEFAULT_CONSENT_DAYS),
    }),
    fetchTransactions: async () => history,
    fetchBalance: async () => null,
    revoke: async () => {},
  }
}

const cookieOf = (res: request.Response) => String(res.headers['set-cookie']?.[0] ?? '').split(';')[0]
const stateOf = (url: string) => new URL(url, 'http://x').searchParams.get('state')!

const verify = async (token: string) => ({ email: `${token}@x.com` })
const env = { CF_ACCESS_TEAM_DOMAIN: 't', CF_ACCESS_AUD: 'a', ALLOWED_USER_EMAILS: 'me@x.com,other@x.com' }
const as = (token: string) => ({ ...H, 'cf-access-jwt-assertion': token })

async function withHistory(history: BankTransaction[]) {
  const t = await createTestApp({ provider: bankWith(history), env, verify })

  open.push(t)
  const start = await request(t.server).post('/api/banking/connect').set(as('me')).send({ bank: 'B' }).expect(200)
  const cb = await request(t.server)
    .get(`/api/banking/callback?code=c&state=${stateOf(start.body.url)}`)
    .set('Cookie', cookieOf(start))
  const id = new URL(String(cb.headers.location), 'http://x').searchParams.get('c')!

  await request(t.server).post(`/api/banking/connections/${id}/sync`).set(as('me')).send({}).expect(200)

  return t
}

const recent = () => {
  const start = new Date()

  start.setUTCMonth(start.getUTCMonth() - 5)

  return start.toISOString().slice(0, 10)
}

describe('contracts API', () => {
  const history = () => [
    ...months('Vermieter Meier', [950, 950, 950, 950, 950], recent()),
    ...months('Netflix', [9.99, 9.99, 9.99, 9.99, 9.99], recent()),
  ]

  it('lists what it found with monthly totals', async () => {
    const t = await withHistory(history())
    const res = (await request(t.server).get('/api/contracts').set(as('me')).expect(200)).body

    expect(res.contracts.map((c: { name: string }) => c.name)).toEqual(['Vermieter Meier', 'Netflix'])
    expect(res.totals).toEqual([
      expect.objectContaining({
        currency: 'EUR',
        monthly: 959.99,
        fixed: 959.99,
        byGroup: { Rent: 950, Subscriptions: 9.99 },
      }),
    ])
  })

  it('keeps nobody else from seeing or changing them', async () => {
    const t = await withHistory(history())
    const mine = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts
    const theirs = (await request(t.server).get('/api/contracts').set(as('other')).expect(200)).body

    expect(mine).toHaveLength(2)
    expect(theirs.contracts).toEqual([])
    await request(t.server)
      .patch(`/api/contracts/${mine[0].id}`)
      .set(as('other'))
      .send({ state: 'dismissed' })
      .expect(404)
    await request(t.server).delete(`/api/contracts/${mine[0].id}`).set(as('other')).expect(404)
  })

  it('keeps a dismissal and renames across refreshes, and leaves dismissed ones out of totals', async () => {
    const t = await withHistory(history())
    const [rent, netflix] = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts

    await request(t.server)
      .patch(`/api/contracts/${rent.id}`)
      .set(as('me'))
      .send({ name: 'Flat', group: 'Rent' })
      .expect(200)
    await request(t.server).patch(`/api/contracts/${netflix.id}`).set(as('me')).send({ state: 'dismissed' }).expect(200)
    const again = (await request(t.server).get('/api/contracts').set(as('me'))).body

    expect(again.contracts.find((c: { id: string }) => c.id === rent.id).name).toBe('Flat')
    expect(again.contracts.find((c: { id: string }) => c.id === netflix.id).state).toBe('dismissed')
    expect(again.totals[0].monthly).toBe(950)
    expect(again.contracts).toHaveLength(2) // nothing duplicated by the refresh
  })

  it('takes contracts added by hand, with a cost per km, and only lets those be deleted', async () => {
    const t = await withHistory(history())
    const created = (
      await request(t.server)
        .post('/api/contracts')
        .set(as('me'))
        .send({
          name: 'Car lease',
          group: 'Car',
          amount: 300,
          currency: 'EUR',
          frequency: 'monthly',
          kmPerYear: 12000,
        })
        .expect(201)
    ).body

    expect(created).toMatchObject({ state: 'manual', monthly: 300, costPerKm: 0.3, active: true })
    const rent = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts.find(
      (c: { name: string }) => c.name === 'Vermieter Meier',
    )

    await request(t.server).delete(`/api/contracts/${rent.id}`).set(as('me')).expect(404)
    await request(t.server).delete(`/api/contracts/${created.id}`).set(as('me')).expect(204)
  })

  it('rejects malformed requests', async () => {
    const t = await withHistory(history())

    await request(t.server).post('/api/contracts').set(as('me')).send({ name: 'x' }).expect(400)
    await request(t.server).patch('/api/contracts/not-an-id').set(as('me')).send({}).expect(400)
    await request(t.server).post('/api/contracts').send({}).expect(401) // no sign-in at all (production-style)
  })

  it('stores nothing readable: no names, amounts or notes in the table', async () => {
    const t = await withHistory(history())

    await request(t.server).get('/api/contracts').set(as('me'))
    await request(t.server).post('/api/contracts').set(as('me')).send({
      name: 'Secret gym',
      group: 'Subscriptions',
      amount: 33,
      currency: 'EUR',
      frequency: 'monthly',
      note: 'private note',
    })
    const dump = JSON.stringify(t.db.prepare('SELECT * FROM contracts').all())

    // Case-blind, because the payee fingerprint must not be a readable lowercase name either. No numbers are
    // checked: random ciphertext can contain any short digit run.
    expect(dump).not.toMatch(/vermieter|netflix|secret gym|private note/i)
  })

  it('is erased with the stored transactions, except what was added by hand', async () => {
    const t = await withHistory(history())

    await request(t.server).get('/api/contracts').set(as('me'))
    await request(t.server)
      .post('/api/contracts')
      .set(as('me'))
      .send({ name: 'Mine', group: 'Other', amount: 5, currency: 'EUR', frequency: 'monthly' })
    await request(t.server).delete('/api/banking/transactions').set(as('me')).expect(200)
    const left = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts

    expect(left.map((c: { name: string }) => c.name)).toEqual(['Mine'])
  })

  it('puts each contract under one of your categories and says where that came from', async () => {
    const t = await withHistory(history())
    const { contracts } = (await request(t.server).get('/api/contracts').set(as('me'))).body
    const by = (name: string) => contracts.find((c: { name: string }) => c.name === name)

    expect(by('Vermieter Meier')).toMatchObject({ group: 'Rent', groupSource: 'suggested' })
    expect(by('Netflix')).toMatchObject({ group: 'Subscriptions', groupSource: 'suggested' })
  })

  it('asks once: choosing a category is kept as a merchant rule and wins from then on', async () => {
    const t = await withHistory(history())
    const netflix = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts.find(
      (c: { name: string }) => c.name === 'Netflix',
    )

    await request(t.server).patch(`/api/contracts/${netflix.id}`).set(as('me')).send({ group: 'Gifts' }).expect(200)
    const again = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts.find(
      (c: { id: string }) => c.id === netflix.id,
    )

    expect(again).toMatchObject({ group: 'Gifts', groupSource: 'rule' })
    const rules = (await request(t.server).get('/api/learn/mappings').set(as('me'))).body
    const saved = JSON.stringify(rules)

    expect(saved).toContain('Gifts')
    // Another person's rules and contracts are untouched
    expect(JSON.stringify((await request(t.server).get('/api/learn/mappings').set(as('other'))).body)).not.toContain(
      'Gifts',
    )
  })

  it('only accepts categories the person has', async () => {
    const t = await withHistory(history())
    const [first] = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts

    await request(t.server)
      .patch(`/api/contracts/${first.id}`)
      .set(as('me'))
      .send({ group: 'Not a category' })
      .expect(400)
    await request(t.server)
      .post('/api/contracts')
      .set(as('me'))
      .send({ name: 'x', group: 'Housing', amount: 5, currency: 'EUR', frequency: 'monthly' })
      .expect(400) // the old fixed groups are gone
  })

  it('follows the person’s own category list', async () => {
    const t = await withHistory(history())

    await request(t.server)
      .post('/api/settings/sheet')
      .set(as('me'))
      .send({ categoryMappings: [{ appCategory: 'Housing costs', sheetColumn: 'B' }] })
      .expect(200)
    const rent = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts.find(
      (c: { name: string }) => c.name === 'Vermieter Meier',
    )

    // They have no "Rent" category, so nothing is suggested instead of inventing one
    expect(rent).toMatchObject({ group: 'Other', groupSource: 'none' })
  })

  it('shows the payments a contract was found from, to its owner only', async () => {
    const t = await withHistory(history())
    const rent = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts.find(
      (c: { name: string }) => c.name === 'Vermieter Meier',
    )
    const res = (await request(t.server).get(`/api/contracts/${rent.id}/payments`).set(as('me')).expect(200)).body

    expect(res.payments).toHaveLength(5)
    expect(res.payments[0]).toMatchObject({ amount: 950 })
    expect(res.payments[0].date >= res.payments[4].date).toBe(true) // newest first
    await request(t.server).get(`/api/contracts/${rent.id}/payments`).set(as('other')).expect(404)
  })

  it('picks up new transactions after a sync, and calls only later finds new', async () => {
    const rows = history()
    const t = await withHistory(rows)
    const first = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts

    expect(first.every((c: { isNew: boolean }) => !c.isNew)).toBe(true) // the first batch is not news
    // Pretend those were found a while ago, then a new payee reaches three payments
    t.db.prepare('UPDATE contracts SET created_at = ?').run(new Date(Date.now() - 5 * 86_400_000).toISOString())
    rows.push(...months('Spotify', [10.99, 10.99, 10.99], recent()))
    t.db.prepare('UPDATE bank_connections SET last_sync_started_at = NULL').run()
    const id = (await request(t.server).get('/api/banking/connections').set(as('me'))).body.connections[0].id

    await request(t.server).post(`/api/banking/connections/${id}/sync`).set(as('me')).send({}).expect(200)
    const next = (await request(t.server).get('/api/contracts').set(as('me'))).body.contracts
    const spotify = next.find((c: { name: string }) => c.name === 'Spotify')

    expect(spotify).toMatchObject({ isNew: true })
    expect(next.filter((c: { isNew: boolean }) => c.isNew)).toHaveLength(1)
  })

  it('works out when a hand-made contract is next due', async () => {
    const t = await withHistory(history())
    const made = (
      await request(t.server)
        .post('/api/contracts')
        .set(as('me'))
        .send({
          name: 'Gym',
          group: 'Other',
          amount: 30,
          currency: 'EUR',
          frequency: 'monthly',
          startDate: '2026-01-15',
        })
        .expect(201)
    ).body

    expect(made.nextExpected >= new Date().toISOString().slice(0, 10)).toBe(true)
    expect(made.nextExpected.endsWith('-15')).toBe(true)
  })
})
