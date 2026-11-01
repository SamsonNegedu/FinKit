import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SIGNED_IN_HEADERS as H, TestAppOptions, createTestApp } from '../testing/test-app'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []
const dirs: string[] = []

async function make(options?: TestAppOptions) {
  const t = await createTestApp(options)

  open.push(t)

  return t
}
afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
  while (dirs.length) {
    rmSync(dirs.pop()!, { recursive: true, force: true })
  }
})

const as = (who: string) => ({ ...H, 'X-Dev-User': who })
const ALICE = 'alice@x.com'
const BOB = 'bob@x.com'
const household = { ALLOWED_USER_EMAILS: `${ALICE},${BOB}` }

describe('users: whose data is whose', () => {
  it('keeps each person’s learned rules apart', async () => {
    const t = await make({ env: household })

    await request(t.server)
      .post('/api/learn/mapping')
      .set(as(ALICE))
      .send({ merchant: 'DeepSeek', category: 'Subscriptions' })
      .expect(200)
    await request(t.server)
      .post('/api/learn/mapping')
      .set(as(BOB))
      .send({ merchant: 'DeepSeek', category: 'Software' })
      .expect(200)

    const alice = (await request(t.server).get('/api/learn/mappings').set(as(ALICE))).body.data
    const bob = (await request(t.server).get('/api/learn/mappings').set(as(BOB))).body.data

    expect(alice.map((r: { category: string }) => r.category)).toEqual(['Subscriptions'])
    expect(bob.map((r: { category: string }) => r.category)).toEqual(['Software'])

    await request(t.server).delete('/api/learn/mapping/DeepSeek').set(as(BOB)).expect(200)
    expect((await request(t.server).get('/api/learn/mappings').set(as(ALICE))).body.data).toHaveLength(1)
  })

  it('keeps each person’s settings apart', async () => {
    const t = await make({ env: household })

    await request(t.server).post('/api/settings/theme').set(as(ALICE)).send({ value: 'dark' }).expect(200)
    await request(t.server).get('/api/settings/theme').set(as(BOB)).expect(404)
    expect((await request(t.server).get('/api/settings/theme').set(as(ALICE)).expect(200)).body.data).toBe('dark')
  })

  it('keeps bank connections private to whoever made them', async () => {
    const t = await make({ env: household })
    const start = await request(t.server).post('/api/banking/connect').set(as(ALICE)).send({ bank: 'N26' }).expect(200)
    const state = new URL(start.body.url, 'http://x').searchParams.get('state')!
    const decide = await request(t.server)
      .get(`/api/banking/mock-bank/decide?state=${encodeURIComponent(state)}&d=approve`)
      .expect(302)
    const cookie = String(start.headers['set-cookie']?.[0] ?? '').split(';')[0]

    // The bank's return carries no sign-in: the connection belongs to whoever started it
    await request(t.server).get(String(decide.headers.location)).set('Cookie', cookie).expect(302)

    const mine = (await request(t.server).get('/api/banking/connections').set(as(ALICE))).body.connections

    expect(mine).toHaveLength(1)
    const id = mine[0].id

    expect((await request(t.server).get('/api/banking/connections').set(as(BOB))).body.connections).toEqual([])
    await request(t.server).post(`/api/banking/connections/${id}/sync`).set(as(BOB)).send({}).expect(404)
    await request(t.server).delete(`/api/banking/connections/${id}`).set(as(BOB)).expect(404)
    await request(t.server).post(`/api/banking/connections/${id}/sync`).set(as(ALICE)).send({}).expect(200)
  })
})

describe('users: the back office is private too', () => {
  it('shows each person only their own sync history, audit trail and counts', async () => {
    const t = await make({ env: household })
    const start = await request(t.server).post('/api/banking/connect').set(as(ALICE)).send({ bank: 'N26' }).expect(200)
    const state = new URL(start.body.url, 'http://x').searchParams.get('state')!
    const decide = await request(t.server)
      .get(`/api/banking/mock-bank/decide?state=${encodeURIComponent(state)}&d=approve`)
      .expect(302)
    const cookie = String(start.headers['set-cookie']?.[0] ?? '').split(';')[0]

    await request(t.server).get(String(decide.headers.location)).set('Cookie', cookie).expect(302)
    const id = (await request(t.server).get('/api/banking/connections').set(as(ALICE))).body.connections[0].id

    await request(t.server).post(`/api/banking/connections/${id}/sync`).set(as(ALICE)).send({}).expect(200)

    const trail = (who: string) => request(t.server).get('/api/banking/admin/audit').set(as(who))
    const alice = (await trail(ALICE)).body.entries.map((e: { action: string }) => e.action)

    expect(alice).toEqual(expect.arrayContaining(['connect.start', 'connect.complete', 'sync']))
    expect((await trail(BOB)).body.entries).toEqual([])

    expect((await request(t.server).get('/api/banking/admin/sync-log').set(as(ALICE))).body.entries).toHaveLength(1)
    expect((await request(t.server).get('/api/banking/admin/sync-log').set(as(BOB))).body.entries).toEqual([])

    const counts = async (who: string) => (await request(t.server).get('/api/banking/admin/overview').set(as(who))).body

    expect((await counts(ALICE)).connections.total).toBe(1)
    expect((await counts(BOB)).connections.total).toBe(0)
    expect((await counts(BOB)).syncs30d.total).toBe(0)
  })
})

describe('users: who may sign in', () => {
  it('lets listed people in and refuses strangers', async () => {
    const t = await make({ env: { ALLOWED_USER_EMAILS: ALICE } })

    await request(t.server).get('/api/learn/mappings').expect(200) // locally the developer is always in
    await request(t.server).get('/api/learn/mappings').set(as('mallory@x.com')).expect(403)
    await request(t.server).get('/api/learn/mappings').set(as(ALICE)).expect(200)
  })

  it('refuses everyone when no one is listed outside local development', async () => {
    const t = await make({
      env: { CF_ACCESS_TEAM_DOMAIN: 't', CF_ACCESS_AUD: 'a' },
      verify: async () => ({ email: 'me@x.com' }),
    })

    expect(
      (
        await request(t.server)
          .get('/api/learn/mappings')
          .set({ ...H, 'cf-access-jwt-assertion': 't' })
      ).status,
    ).toBe(403)
  })

  it('locks someone out as soon as they are taken off the list', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'finkit-'))

    dirs.push(dir)
    const file = join(dir, 'people.db')
    const cf = { CF_ACCESS_TEAM_DOMAIN: 't', CF_ACCESS_AUD: 'a' }
    const verify = async () => ({ email: BOB })
    const headers = { ...H, 'cf-access-jwt-assertion': 't' }
    const first = await make({
      env: { ...cf, ALLOWED_USER_EMAILS: `${ALICE},${BOB}` },
      verify,
      databaseFile: file,
    })

    await request(first.server).get('/api/learn/mappings').set(headers).expect(200)
    await first.close()
    open.pop()
    // Same database, Bob no longer listed: he already has an account but must not get in
    const second = await make({
      env: { ...cf, ALLOWED_USER_EMAILS: ALICE },
      verify,
      databaseFile: file,
    })

    await request(second.server).get('/api/learn/mappings').set(headers).expect(403)
  })

  it('does not trust the X-Dev-User header in production', async () => {
    const t = await make({
      env: {
        NODE_ENV: 'production',
        ALLOWED_ORIGIN: 'https://finkit.test',
        BANKING_PROVIDER: 'off',
        CF_ACCESS_TEAM_DOMAIN: 't',
        CF_ACCESS_AUD: 'a',
        ALLOWED_USER_EMAILS: 'me@x.com',
      },
      verify: async () => ({ email: 'me@x.com' }),
    })
    const tok = { 'Cf-Access-Jwt-Assertion': 'tok' }

    await request(t.server)
      .post('/api/learn/mapping')
      .set(H)
      .set(tok)
      .set('Origin', 'https://finkit.test')
      .send({ merchant: 'Lidl', category: 'Groceries' })
      .expect(200)
    // A different name in the header must not switch users: same data comes back
    const seen = await request(t.server).get('/api/learn/mappings').set(as('someone@else.com')).set(tok).expect(200)

    expect(seen.body.data).toHaveLength(1)
  })

  it('refuses the API without a token once sign-in is configured', async () => {
    const t = await make({
      env: { CF_ACCESS_TEAM_DOMAIN: 't', CF_ACCESS_AUD: 'a' },
      verify: async () => ({ email: 'me@x.com' }),
    })

    for (const [method, path] of [
      ['get', '/api/learn/mappings'],
      ['get', '/api/settings/sheet'],
      ['post', '/api/export/sheets'],
    ] as const) {
      expect((await request(t.server)[method](path).set(H)).status, `${method} ${path}`).toBe(401)
    }
  })
})

describe('users: data from before accounts existed', () => {
  it('goes to the first listed address, even when someone else arrives first', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'finkit-'))

    dirs.push(dir)
    const file = join(dir, 'old.db')
    const old = new Database(file)

    old.exec(`
      CREATE TABLE merchant_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_key TEXT NOT NULL UNIQUE,
        merchant_display TEXT NOT NULL, category TEXT NOT NULL, confidence INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO merchant_categories (merchant_key, merchant_display, category) VALUES ('rewe', 'REWE', 'Groceries');
    `)
    old.close()
    const t = await make({ env: household, databaseFile: file })

    // Alice is allowed in and arrives first, but she is not the first address listed, so she inherits nothing.
    expect((await request(t.server).get('/api/learn/mappings').set(as(ALICE))).body.data).toEqual([])
    // The developer (listed first) arrives later and still gets everything that existed before accounts
    expect((await request(t.server).get('/api/learn/mappings').set(H)).body.data).toHaveLength(1)
    expect((await request(t.server).get('/api/learn/mappings').set(as(ALICE))).body.data).toEqual([])
  })

  it('goes to the first listed address on upgrade, and to nobody else', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'finkit-'))

    dirs.push(dir)
    const file = join(dir, 'old.db')
    // The tables exactly as the previous version created them
    const old = new Database(file)

    old.exec(`
      CREATE TABLE merchant_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_key TEXT NOT NULL UNIQUE,
        merchant_display TEXT NOT NULL, category TEXT NOT NULL, confidence INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO merchant_categories (merchant_key, merchant_display, category) VALUES ('rewe', 'REWE', 'Groceries');
      INSERT INTO settings (key, value) VALUES ('theme', '"dark"');
    `)
    old.close()

    const t = await make({ env: household, databaseFile: file })

    // The developer (listed first) inherits it
    expect(
      (await request(t.server).get('/api/learn/mappings').set(H)).body.data.map(
        (r: { merchant: string }) => r.merchant,
      ),
    ).toEqual(['rewe'])
    expect((await request(t.server).get('/api/settings/theme').set(H).expect(200)).body.data).toBe('dark')
    // A later arrival sees none of it
    expect((await request(t.server).get('/api/learn/mappings').set(as(ALICE))).body.data).toEqual([])
    await request(t.server).get('/api/settings/theme').set(as(ALICE)).expect(404)
  })
})
