import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, createTestApp } from '../testing/test-app'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []

afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
})

const verify = async (token: string) => ({ email: `${token}@x.com` })
const env = { CF_ACCESS_TEAM_DOMAIN: 't', CF_ACCESS_AUD: 'a', ALLOWED_USER_EMAILS: 'me@x.com,other@x.com' }
const as = (token: string) => ({ ...H, 'cf-access-jwt-assertion': token })

async function make() {
  const t = await createTestApp({ env, verify })

  open.push(t)

  return t
}

describe('merchant rules with a subcategory (/api/learn)', () => {
  it('keeps the subcategory with the category, and drops it when a later pick has none', async () => {
    const t = await make()
    const learn = (body: object) => request(t.server).post('/api/learn/mapping').set(as('me')).send(body).expect(200)
    const list = async () => (await request(t.server).get('/api/learn/mappings').set(as('me'))).body.data

    await learn({ merchant: 'H&M', category: 'Shopping', detail: 'Fashion' })
    expect(await list()).toMatchObject([{ category: 'Shopping', detail: 'Fashion' }])
    await learn({ merchant: 'H&M', category: 'Gifts' })
    expect((await list())[0].detail).toBeUndefined()
  })

  it('saves subcategories in a batch and keeps them to the person who made them', async () => {
    const t = await make()

    await request(t.server)
      .post('/api/learn/mappings/batch')
      .set(as('me'))
      .send({ mappings: [{ merchant: 'Temu', category: 'Shopping', detail: 'Gear' }] })
      .expect(200)
    expect((await request(t.server).get('/api/learn/mappings').set(as('me'))).body.data[0].detail).toBe('Gear')
    expect((await request(t.server).get('/api/learn/mappings').set(as('other'))).body.data).toEqual([])
  })

  it('refuses a subcategory that is empty or too long', async () => {
    const t = await make()
    const learn = (detail: string) =>
      request(t.server)
        .post('/api/learn/mapping')
        .set(as('me'))
        .send({ merchant: 'Temu', category: 'Shopping', detail })

    expect((await learn('')).status).toBe(400)
    expect((await learn('x'.repeat(41))).status).toBe(400)
  })
})
