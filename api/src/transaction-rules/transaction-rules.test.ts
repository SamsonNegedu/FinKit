import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, createTestApp } from '../testing/test-app'

const as = (who: string) => ({ ...H, 'X-Dev-User': who })
let t: Awaited<ReturnType<typeof createTestApp>>

afterEach(() => t?.close())

const rule = { match: { payee: 'Aldi', words: ['Prepaid-Konto'], amount: 8.99 }, category: 'Internet' }

describe('transaction rules', () => {
  it('saves a rule, lists it, and removes it', async () => {
    t = await createTestApp()
    const made = await request(t.server).post('/api/transaction-rules').set(H).send(rule).expect(201)

    expect(made.body).toMatchObject(rule)
    expect((await request(t.server).get('/api/transaction-rules').set(H)).body.rules).toEqual([made.body])
    await request(t.server).delete(`/api/transaction-rules/${made.body.id}`).set(H).expect(204)
    await request(t.server).delete(`/api/transaction-rules/${made.body.id}`).set(H).expect(404)
  })

  it("never shows or removes another person's rules", async () => {
    t = await createTestApp({ env: { ALLOWED_USER_EMAILS: 'a@example.com,b@example.com' } })
    const made = await request(t.server).post('/api/transaction-rules').set(as('a@example.com')).send(rule)

    expect((await request(t.server).get('/api/transaction-rules').set(as('b@example.com'))).body.rules).toEqual([])
    await request(t.server).delete(`/api/transaction-rules/${made.body.id}`).set(as('b@example.com')).expect(404)
    expect((await request(t.server).get('/api/transaction-rules').set(as('a@example.com'))).body.rules).toHaveLength(1)
  })

  it('keeps the matching text encrypted in the database', async () => {
    t = await createTestApp()
    await request(t.server).post('/api/transaction-rules').set(H).send(rule).expect(201)
    const stored = t.db.prepare('SELECT match FROM transaction_rules').get() as { match: string }

    expect(stored.match).not.toContain('Prepaid-Konto')
    expect(stored.match.startsWith('v1.')).toBe(true)
  })

  it('rejects an empty rule and changing requests without the CSRF header', async () => {
    t = await createTestApp()
    await request(t.server).post('/api/transaction-rules').set(H).send({ match: {}, category: 'Internet' }).expect(400)
    await request(t.server).post('/api/transaction-rules').send(rule).expect(403)
  })
})
