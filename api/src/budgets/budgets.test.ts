import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SIGNED_IN_HEADERS as H, createTestApp } from '../testing/test-app'

const as = (who: string) => ({ ...H, 'X-Dev-User': who })
let t: Awaited<ReturnType<typeof createTestApp>>

afterEach(() => t?.close())

describe('budgets', () => {
  it('saves a limit, replaces it for the same category, and removes it', async () => {
    t = await createTestApp()
    await request(t.server).put('/api/budgets').set(H).send({ category: 'Groceries', currency: 'EUR', amount: 400 })
    await request(t.server).put('/api/budgets').set(H).send({ category: 'Groceries', currency: 'EUR', amount: 450 })

    const list = await request(t.server).get('/api/budgets').set(H)

    expect(list.body.budgets).toEqual([
      { category: 'Groceries', currency: 'EUR', amount: 450, rollover: false, startsMonth: null },
    ])
    await request(t.server).delete('/api/budgets/EUR/Groceries').set(H).expect(204)
    await request(t.server).delete('/api/budgets/EUR/Groceries').set(H).expect(404)
  })

  it("never shows or changes another person's limits", async () => {
    t = await createTestApp({ env: { ALLOWED_USER_EMAILS: 'a@example.com,b@example.com' } })
    await request(t.server)
      .put('/api/budgets')
      .set(as('a@example.com'))
      .send({ category: 'Rent', currency: 'EUR', amount: 900 })

    const theirs = await request(t.server).get('/api/budgets').set(as('b@example.com'))

    expect(theirs.body.budgets).toEqual([])
    await request(t.server).delete('/api/budgets/EUR/Rent').set(as('b@example.com')).expect(404)
    expect((await request(t.server).get('/api/budgets').set(as('a@example.com'))).body.budgets).toHaveLength(1)
  })

  it('rejects bad input and changing requests without the CSRF header', async () => {
    t = await createTestApp()
    await request(t.server)
      .put('/api/budgets')
      .set(H)
      .send({ category: 'Food', currency: 'eur', amount: 5 })
      .expect(400)
    await request(t.server)
      .put('/api/budgets')
      .set(H)
      .send({ category: 'Food', currency: 'EUR', amount: -5 })
      .expect(400)
    await request(t.server)
      .put('/api/budgets')
      .set({ 'Content-Type': 'application/json' })
      .send({ category: 'Food', currency: 'EUR', amount: 5 })
      .expect(403)
  })

  it('keeps rollover on, and the month it began, when the limit is changed later', async () => {
    t = await createTestApp()
    const put = (body: object) => request(t.server).put('/api/budgets').set(H).send(body)

    await put({ category: 'Food', currency: 'EUR', amount: 100, rollover: true, startsMonth: '2026-09' }).expect(200)
    await put({ category: 'Food', currency: 'EUR', amount: 120, rollover: true, startsMonth: '2026-11' }).expect(200)

    const [food] = (await request(t.server).get('/api/budgets').set(H)).body.budgets

    expect(food).toMatchObject({ amount: 120, rollover: true, startsMonth: '2026-09' })
    await put({ category: 'Food', currency: 'EUR', amount: 120, startsMonth: '2026-13' }).expect(400)
  })

  it('keeps one overall cap per currency, private to its owner', async () => {
    t = await createTestApp({ env: { ALLOWED_USER_EMAILS: 'a@example.com,b@example.com' } })
    const cap = (who: string, body: object) => request(t.server).put('/api/budget-cap').set(as(who)).send(body)

    await cap('a@example.com', { currency: 'EUR', amount: 2000 }).expect(200)
    await cap('a@example.com', { currency: 'EUR', amount: 2500 }).expect(200)
    await cap('a@example.com', { currency: 'EUR', amount: -1 }).expect(400)

    expect((await request(t.server).get('/api/budgets').set(as('a@example.com'))).body.caps).toEqual([
      { currency: 'EUR', amount: 2500 },
    ])
    expect((await request(t.server).get('/api/budgets').set(as('b@example.com'))).body.caps).toEqual([])
    await request(t.server).delete('/api/budget-cap/EUR').set(as('b@example.com')).expect(404)
    await request(t.server).delete('/api/budget-cap/EUR').set(as('a@example.com')).expect(204)
  })

  it('upgrades a database made before rollover and caps existed, keeping its rows', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'finkit-budgets-')), 'old.db')
    const old = new Database(file)

    old.exec(`CREATE TABLE budgets (user_id TEXT NOT NULL, category TEXT NOT NULL, currency TEXT NOT NULL,
      amount REAL NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, category, currency));
      INSERT INTO budgets VALUES ('someone', 'Rent', 'EUR', 900, '2026-01-01T00:00:00Z');`)
    old.close()
    t = await createTestApp({ databaseFile: file })

    expect(t.db.prepare('SELECT category, amount, rollover, starts_month FROM budgets').all()).toEqual([
      { category: 'Rent', amount: 900, rollover: 0, starts_month: null },
    ])
    expect(t.db.prepare('SELECT COUNT(*) AS n FROM budget_caps').get()).toEqual({ n: 0 })
  })
})
