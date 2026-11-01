import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, TestAppOptions, createTestApp } from '../../testing/test-app'
import { BankAutoSync } from '../sync/bank-auto-sync'
import { BankSyncService } from '../sync/bank-sync.service'
import { TestBankProvider } from '../providers/test-bank.provider'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []

async function make(options?: TestAppOptions) {
  const t = await createTestApp({ ...options, env: { ALLOWED_USER_EMAILS: `${ALICE},${BOB}`, ...options?.env } })

  open.push(t)

  return t
}
afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
})

const ALICE = 'alice@x.com'
const BOB = 'bob@x.com'
const as = (who: string) => ({ ...H, 'X-Dev-User': who })
const loc = (res: request.Response) => String(res.headers.location ?? '')
const cookieOf = (res: request.Response) => String(res.headers['set-cookie']?.[0] ?? '').split(';')[0]

async function connect(t: TestApp, who: string, extra: Record<string, unknown> = {}) {
  const start = await request(t.server)
    .post('/api/banking/connect')
    .set(as(who))
    .send({ bank: 'N26', ...extra })
    .expect(200)
  const state = new URL(start.body.url, 'http://x').searchParams.get('state')!
  const decide = await request(t.server)
    .get(`/api/banking/mock-bank/decide?state=${encodeURIComponent(state)}&d=approve`)
    .expect(302)
  const back = await request(t.server).get(loc(decide)).set('Cookie', cookieOf(start))

  return new URL(loc(back), 'http://x').searchParams.get('c')!
}
const sync = (t: TestApp, who: string, id: string) =>
  request(t.server).post(`/api/banking/connections/${id}/sync`).set(as(who)).send({})
const stored = async (t: TestApp, who: string) =>
  (await request(t.server).get('/api/banking/transactions').set(as(who)).expect(200)).body

describe('stored transactions', () => {
  it('keeps what a sync fetched, and a repeat sync adds nothing', async () => {
    let now = new Date('2026-10-20T12:00:00Z')
    const t = await make({ clock: { now: () => now } })
    const id = await connect(t, ALICE)
    const first = (await sync(t, ALICE, id).expect(200)).body

    expect((await stored(t, ALICE)).count).toBe(first.count)
    expect(first.added).toBe(first.count)
    now = new Date('2026-10-20T12:05:00Z')
    const again = (await sync(t, ALICE, id).expect(200)).body

    expect(again.added).toBe(0)
    expect((await stored(t, ALICE)).count).toBe(first.count)
  })

  it('filters by date range and rejects malformed dates', async () => {
    const t = await make()

    await sync(t, ALICE, await connect(t, ALICE))
    const all = await stored(t, ALICE)
    const one = all.transactions[0].date
    const day = (await request(t.server).get(`/api/banking/transactions?from=${one}&to=${one}`).set(as(ALICE))).body

    expect(day.count).toBeGreaterThan(0)
    expect(day.count).toBeLessThanOrEqual(all.count)
    expect(day.transactions.every((x: { date: string }) => x.date === one)).toBe(true)
    await request(t.server).get('/api/banking/transactions?from=yesterday').set(as(ALICE)).expect(400)
  })

  it('keeps descriptions, names and IBANs encrypted at rest', async () => {
    const t = await make()

    await sync(t, ALICE, await connect(t, ALICE))
    const dump = JSON.stringify(t.db.prepare('SELECT * FROM bank_transactions').all())

    expect(dump).not.toMatch(/REWE|Netflix|Salary|Acme|Amazon|Shell|DE\d{20}/)
    expect(t.db.prepare('SELECT payload FROM bank_transactions LIMIT 1').get()).toMatchObject({
      payload: expect.stringMatching(/^v1\./),
    })
  })

  it('shows each person only their own, and one person cannot delete another’s', async () => {
    const t = await make()

    await sync(t, ALICE, await connect(t, ALICE))
    await sync(t, BOB, await connect(t, BOB))
    const alice = await stored(t, ALICE)
    const bob = await stored(t, BOB)

    expect(alice.count).toBeGreaterThan(0)
    expect(bob.count).toBeGreaterThan(0)
    // Same test bank, so the same rows are stored once each, never shared between them
    expect(t.db.prepare('SELECT COUNT(*) AS n FROM bank_transactions').get()).toEqual({ n: alice.count + bob.count })
    expect((await request(t.server).delete('/api/banking/transactions').set(as(BOB)).expect(200)).body.deleted).toBe(
      bob.count,
    )
    expect((await stored(t, BOB)).count).toBe(0)
    expect((await stored(t, ALICE)).count).toBe(alice.count)
  })

  it('is removed with its connection, and survives a reconnect', async () => {
    const now = new Date('2026-10-20T12:00:00Z')
    const t = await make({ clock: { now: () => now } })
    const first = await connect(t, ALICE)

    await sync(t, ALICE, first)
    const before = (await stored(t, ALICE)).count
    const second = await connect(t, ALICE, { reconnect: first })

    expect((await stored(t, ALICE)).count).toBe(before) // history carried over
    await request(t.server).delete(`/api/banking/connections/${second}`).set(as(ALICE)).expect(200)
    expect((await stored(t, ALICE)).count).toBe(0)
  })
})

describe('connections made before the account IBAN was kept', () => {
  it('suggest a reconnect, new ones do not', async () => {
    const t = await make()
    const id = await connect(t, ALICE)
    const list = async () =>
      (await request(t.server).get('/api/banking/connections').set(as(ALICE))).body.connections[0]

    expect((await list()).reconnectSuggested).toBe(false)
    expect(JSON.stringify(await list())).not.toMatch(/ownIban|DE\d{20}/) // nothing extra reaches the browser
    t.db
      .prepare('UPDATE bank_connections SET account_labels = ? WHERE id = ?')
      .run(JSON.stringify([{ id: 'a1', label: '…1234', currency: 'EUR' }]), id)
    expect((await list()).reconnectSuggested).toBe(true)
  })
})

describe('telling the bank who is syncing', () => {
  class Spy extends TestBankProvider {
    seen: Array<{ psu?: unknown; longest?: boolean; required?: string[] }> = []

    async listBanks(country: string) {
      return (await super.listBanks(country)).map(b => ({ ...b, requiredPsuHeaders: ['Psu-Ip-Address'] }))
    }

    async fetchTransactions(p: Parameters<TestBankProvider['fetchTransactions']>[0]) {
      this.seen.push({
        psu: (p as { psu?: unknown }).psu,
        longest: (p as { longest?: boolean }).longest,
        required: p.session.requiredPsuHeaders,
      })

      return super.fetchTransactions(p)
    }
  }

  it('passes the person and the bank’s needs to a manual sync, and nothing to a scheduled one', async () => {
    const provider = new Spy()
    let now = new Date('2026-10-20T12:00:00Z')
    const t = await make({ provider, clock: { now: () => now } })
    const id = await connect(t, ALICE)

    await request(t.server)
      .post(`/api/banking/connections/${id}/sync`)
      .set(as(ALICE))
      .set('User-Agent', 'TestBrowser/1.0')
      .send({})
      .expect(200)
    expect(provider.seen[0]).toMatchObject({
      required: ['Psu-Ip-Address'],
      longest: true, // the very first fetch
      psu: { userAgent: 'TestBrowser/1.0' },
    })
    now = new Date('2026-10-21T04:00:00Z')
    await t.app.get(BankSyncService).syncDue(12)
    expect(provider.seen.at(-1)).toMatchObject({ psu: undefined, longest: false })
  })
})

describe('scheduled catch-up', () => {
  it('syncs due connections only, for the right person, and then leaves them alone', async () => {
    let now = new Date('2026-10-20T12:00:00Z')
    const t = await make({ clock: { now: () => now } })
    const id = await connect(t, ALICE)

    await connect(t, BOB)
    const svc = t.app.get(BankSyncService)

    expect(await svc.syncDue(12)).toBe(2) // never synced: both are due
    expect((await stored(t, ALICE)).count).toBeGreaterThan(0)
    expect((await stored(t, BOB)).count).toBeGreaterThan(0)
    now = new Date('2026-10-20T20:00:00Z')
    expect(await svc.syncDue(12)).toBe(0) // only 8 hours later
    now = new Date('2026-10-21T01:00:00Z')
    expect(await svc.syncDue(12)).toBe(2)
    expect(
      t.store!.auditLog(t.db.prepare('SELECT id FROM users WHERE email = ?').pluck().get(ALICE) as string),
    ).toEqual(expect.arrayContaining([expect.objectContaining({ actor: 'scheduler', action: 'sync' })]))
    expect(id).toBeTruthy()
  })

  it('marks an expired consent and keeps going', async () => {
    let now = new Date('2026-10-20T12:00:00Z')
    const t = await make({ clock: { now: () => now } })
    const id = await connect(t, ALICE)

    await connect(t, BOB)
    t.store!.setValidUntil(id, '2026-10-21T00:00:00Z')
    now = new Date('2026-10-22T12:00:00Z') // Alice's consent has run out
    const svc = t.app.get(BankSyncService)

    expect(await svc.syncDue(12)).toBe(1) // Bob's still synced
    expect(t.app.get(BankAutoSync)).toBeDefined()
  })

  it('does not start without an interval', async () => {
    const t = await make({ env: { BANKING_AUTO_SYNC_HOURS: '0' } })

    expect(await t.app.get(BankAutoSync).tick()).toBe(0)
  })
})
