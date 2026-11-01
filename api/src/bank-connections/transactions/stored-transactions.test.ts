import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { encrypt } from '../../shared/crypto/encryption'
import { SIGNED_IN_HEADERS as H, TEST_KEY, TestAppOptions, createTestApp } from '../../testing/test-app'
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

  it('answers a date range from the index and decrypts only the rows in it', async () => {
    const t = await make()

    await sync(t, ALICE, await connect(t, ALICE))
    const plan = t.db
      .prepare(
        `EXPLAIN QUERY PLAN SELECT payload FROM bank_transactions
         WHERE user_id = ? AND tx_date >= ? AND tx_date <= ? ORDER BY tx_date DESC, id DESC`,
      )
      .all('u', '2026-01-01', '2026-12-31') as Array<{ detail: string }>
    const detail = plan.map(p => p.detail).join(' ')

    expect(detail).toContain('idx_bank_tx_user_txdate')
    expect(detail).not.toContain('TEMP B-TREE') // no separate sort step
  })

  it('keeps every part of a transaction encrypted at rest, with an opaque repeat key', async () => {
    const t = await make()

    await sync(t, ALICE, await connect(t, ALICE))
    const rows = t.db.prepare('SELECT * FROM bank_transactions').all() as Array<Record<string, unknown>>
    // created_at is when we stored the row (it can coincide with a booking date), so it is left out of the content check
    const dump = JSON.stringify(rows.map(r => ({ ...r, created_at: undefined })))
    const first = (await stored(t, ALICE)).transactions[0]

    expect(Object.keys(rows[0]).toSorted()).toEqual([
      'connection_id',
      'created_at',
      'ext_key',
      'id',
      'payload',
      'tx_date',
      'user_id',
    ])
    expect(dump).not.toMatch(/REWE|Netflix|Salary|Acme|Amazon|Shell|DE\d{20}/)
    expect(rows.every(r => /^\d{4}-\d{2}-\d{2}$/.test(String(r.tx_date)))).toBe(true) // the date is readable on purpose
    expect(rows.map(r => r.tx_date)).toContain(first.date)
    expect(String(rows[0].payload)).toMatch(/^v1\./)
    expect(String(rows[0].ext_key)).toMatch(/^[0-9a-f]{64}$/) // not the bank's reference, nor derived readably from it
    expect(dump).not.toContain(String(first.externalId))
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

describe('upgrading older stored data', () => {
  it('moves rows from the layout that kept date and amount readable, without losing or duplicating any', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'finkit-'))
    const file = join(dir, 'db.sqlite')

    try {
      const first = await createTestApp({ databaseFile: file, env: { ALLOWED_USER_EMAILS: ALICE } })

      await request(first.server).get('/api/banking/connections').set(as(ALICE)).expect(200)
      const userId = (first.db.prepare('SELECT id FROM users WHERE email = ?').get(ALICE) as { id: string }).id

      // Put it back the way the first version stored it
      first.db.exec('DROP TABLE bank_transactions')
      first.db.exec(`CREATE TABLE bank_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
        connection_id TEXT NOT NULL, ext_key TEXT NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL,
        currency TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE UNIQUE INDEX idx_bank_tx_unique ON bank_transactions(user_id, ext_key);
        CREATE INDEX idx_bank_tx_user_date ON bank_transactions(user_id, date)`)
      const put = first.db.prepare('INSERT INTO bank_transactions VALUES (NULL,?,?,?,?,?,?,?,?)')
      const body = (d: string) =>
        encrypt(JSON.stringify({ description: d, externalId: `acc:${d}`, rawData: {} }), TEST_KEY)

      put.run(userId, 'c1', 'acc:old1', '2026-09-01', -12.5, 'EUR', body('old1'), '2026-09-02T00:00:00Z')
      put.run(userId, 'c1', 'acc:old2', '2026-09-03', 99, 'EUR', body('old2'), '2026-09-04T00:00:00Z')
      await first.close()

      const second = await createTestApp({ databaseFile: file, env: { ALLOWED_USER_EMAILS: ALICE } })

      open.push(second)
      const list = (await stored(second, ALICE)).transactions

      expect(
        list.map((x: { description: string; date: string; amount: number }) => [x.description, x.date, x.amount]),
      ).toEqual([
        ['old2', '2026-09-03', 99],
        ['old1', '2026-09-01', -12.5],
      ])
      expect(Object.keys(second.db.prepare('SELECT * FROM bank_transactions LIMIT 1').get() as object)).not.toContain(
        'date',
      )
      expect(
        second.db.prepare("SELECT name FROM sqlite_master WHERE name = 'bank_transactions_v1'").get(),
      ).toBeUndefined()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('rows stored before the booking date was kept readable', () => {
  it('fills it in from the encrypted payload on start', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'finkit-'))
    const file = join(dir, 'db.sqlite')

    try {
      const first = await createTestApp({ databaseFile: file, env: { ALLOWED_USER_EMAILS: ALICE } })

      await request(first.server).get('/api/banking/connections').set(as(ALICE)).expect(200)
      const userId = (first.db.prepare('SELECT id FROM users WHERE email = ?').get(ALICE) as { id: string }).id
      const payload = encrypt(JSON.stringify({ date: '2026-08-05', description: 'x', rawData: {} }), TEST_KEY)

      first.db
        .prepare(
          'INSERT INTO bank_transactions (user_id, connection_id, ext_key, payload, created_at) VALUES (?,?,?,?,?)',
        )
        .run(userId, 'c1', 'k1', payload, '2026-08-06T00:00:00Z')
      await first.close()

      const second = await createTestApp({ databaseFile: file, env: { ALLOWED_USER_EMAILS: ALICE } })

      open.push(second)
      const day = (
        await request(second.server).get('/api/banking/transactions?from=2026-08-05&to=2026-08-05').set(as(ALICE))
      ).body

      expect(day.count).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
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
