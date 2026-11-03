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

describe('own categories (/api/settings/categories)', () => {
  it('has none until the person saves a list, then keeps it', async () => {
    const t = await make()

    expect((await request(t.server).get('/api/settings/categories').set(as('me')).expect(200)).body.data).toBeNull()
    const list = { active: ['Rent', 'Groceries', 'Other'], archived: ['Radio Tax'] }

    await request(t.server).post('/api/settings/categories').set(as('me')).send(list).expect(200)
    expect((await request(t.server).get('/api/settings/categories').set(as('me'))).body.data).toEqual(list)
  })

  it('keeps each person’s list to themselves', async () => {
    const t = await make()

    await request(t.server)
      .post('/api/settings/categories')
      .set(as('me'))
      .send({ active: ['Rent'], archived: [] })
      .expect(200)
    expect((await request(t.server).get('/api/settings/categories').set(as('other'))).body.data).toBeNull()
  })

  it('refuses repeats, reserved names and empty ones, whatever the letter case', async () => {
    const t = await make()
    const save = (body: string | object) => request(t.server).post('/api/settings/categories').set(as('me')).send(body)

    await save({ active: ['Rent', 'rent'], archived: [] }).expect(400)
    await save({ active: ['Rent'], archived: ['RENT'] }).expect(400)
    await save({ active: ['Investment'], archived: [] }).expect(400)
    await save({ active: ['  '], archived: [] }).expect(400)
    await save({ active: ['x'.repeat(41)], archived: [] }).expect(400)
    await save({ active: 'Rent' }).expect(400)
    expect((await request(t.server).get('/api/settings/categories').set(as('me'))).body.data).toBeNull()
  })

  it('keeps the icon and color a category was given, and refuses anything else', async () => {
    const t = await make()
    const save = (body: string | object) => request(t.server).post('/api/settings/categories').set(as('me')).send(body)
    const list = { active: ['Pets'], archived: [], style: { Pets: { icon: 'paw-print', color: '#a855f7' } } }

    await save(list).expect(200)
    expect((await request(t.server).get('/api/settings/categories').set(as('me'))).body.data).toEqual(list)
    await save({ ...list, style: { Pets: { color: 'purple' } } }).expect(400)
    await save({ ...list, style: { Pets: { icon: '<script>' } } }).expect(400)
    await save({ ...list, style: { Pets: { icon: 'paw-print', extra: 1 } } }).expect(200)
  })

  it('needs sign-in', async () => {
    const t = await make()

    await request(t.server).get('/api/settings/categories').expect(401)
  })
})
