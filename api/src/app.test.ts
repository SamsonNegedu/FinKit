import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createTestApp } from './testing/test-app'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []
async function make(env?: NodeJS.ProcessEnv) {
  const t = await createTestApp({ env })
  open.push(t)
  return t
}
afterEach(async () => {
  while (open.length) await open.pop()!.close()
})
const json = { 'Content-Type': 'application/json' }

describe('health', () => {
  it('answers on /health and /api/health', async () => {
    const t = await make()
    for (const path of ['/health', '/api/health'])
      expect((await request(t.server).get(path).expect(200)).body.status).toBe('ok')
  })
})

describe('merchant rules (/api/learn)', () => {
  it('learns, lists, updates, and forgets a rule', async () => {
    const t = await make()
    expect(
      (
        await request(t.server)
          .post('/api/learn/mapping')
          .set(json)
          .send({ merchant: 'DeepSeek', category: 'Subscriptions' })
          .expect(200)
      ).body,
    ).toEqual({ success: true, message: 'Learned: "DeepSeek" → "Subscriptions"' })
    await request(t.server)
      .post('/api/learn/mapping')
      .set(json)
      .send({ merchant: 'DeepSeek', category: 'Software' })
      .expect(200)
    const list = (await request(t.server).get('/api/learn/mappings').expect(200)).body
    expect(list).toMatchObject({
      success: true,
      data: [{ merchant: 'deepseek', merchantDisplay: 'DeepSeek', category: 'Software', confidence: 2 }],
    })
    expect((await request(t.server).delete('/api/learn/mapping/DeepSeek').expect(200)).body.message).toBe(
      'Deleted mapping for "DeepSeek"',
    )
    expect((await request(t.server).get('/api/learn/mappings')).body.data).toEqual([])
  })
  it('saves a batch and reports stats', async () => {
    const t = await make()
    await request(t.server)
      .post('/api/learn/mappings/batch')
      .set(json)
      .send({
        mappings: [
          { merchant: 'REWE', category: 'Groceries' },
          { merchant: 'Lidl', category: 'Groceries' },
        ],
      })
      .expect(200)
    const stats = (await request(t.server).get('/api/learn/stats').expect(200)).body.data
    expect(stats.total).toBe(2)
    expect(stats.topCategories[0]).toEqual({ category: 'Groceries', count: 2 })
  })
  it('decodes merchant names with special characters once', async () => {
    const t = await make()
    await request(t.server).post('/api/learn/mapping').set(json).send({ merchant: 'Café 100%', category: 'Eating Out' })
    await request(t.server)
      .delete(`/api/learn/mapping/${encodeURIComponent('Café 100%')}`)
      .expect(200)
    expect((await request(t.server).get('/api/learn/mappings')).body.data).toEqual([])
  })
  it('rejects invalid bodies in the established shape', async () => {
    const t = await make()
    const r = await request(t.server).post('/api/learn/mapping').set(json).send({ merchant: '' }).expect(400)
    expect(r.body.error).toBe('Invalid request')
    expect(Array.isArray(r.body.details)).toBe(true)
    await request(t.server).post('/api/learn/mappings/batch').set(json).send({ mappings: 'x' }).expect(400)
  })
})

describe('settings (/api/settings)', () => {
  it('serves defaults, saves, and resets the sheet configuration', async () => {
    const t = await make()
    const defaults = (await request(t.server).get('/api/settings/sheet').expect(200)).body.data
    expect(defaults).toMatchObject({
      sheetId: '',
      tabName: '2026',
      monthFormat: 'short',
      constantColumns: ['S', 'U', 'X'],
    })
    expect(defaults.categoryMappings).toHaveLength(17)
    await request(t.server)
      .post('/api/settings/sheet')
      .set(json)
      .send({ sheetId: 'abc', tabName: '2027', layout: [{ column: 'A', name: 'Month', kind: 'month' }], headerRow: 2 })
      .expect(200)
    const saved = (await request(t.server).get('/api/settings/sheet')).body.data
    expect(saved).toMatchObject({
      sheetId: 'abc',
      tabName: '2027',
      headerRow: 2,
      layout: [{ column: 'A', name: 'Month', kind: 'month' }],
    })
    await request(t.server).delete('/api/settings/sheet').expect(200)
    expect((await request(t.server).get('/api/settings/sheet')).body.data.sheetId).toBe('')
  })
  it('rejects an invalid column kind', async () => {
    const t = await make()
    const r = await request(t.server)
      .post('/api/settings/sheet')
      .set(json)
      .send({ layout: [{ column: 'A', name: 'x', kind: 'nope' }] })
      .expect(400)
    expect(r.body.success).toBe(false)
    expect(Array.isArray(r.body.error)).toBe(true)
  })
  it('keeps generic key-value settings, with the fixed routes taking priority', async () => {
    const t = await make()
    await request(t.server).get('/api/settings/theme').expect(404)
    await request(t.server).post('/api/settings/theme').set(json).send({ value: 'dark' }).expect(200)
    expect((await request(t.server).get('/api/settings/theme')).body).toEqual({ success: true, data: 'dark' })
    const all = (await request(t.server).get('/api/settings')).body.data
    expect(all.theme).toBe('dark')
    expect(all.sheetConfig.tabName).toBe('2026')
  })
})

describe('sheet export (/api/export)', () => {
  it('validates requests before touching Google', async () => {
    const t = await make()
    expect((await request(t.server).post('/api/export/sheets').set(json).send({}).expect(400)).body.error).toBe(
      'Invalid request body',
    )
    expect((await request(t.server).post('/api/export/sheets/layout').set(json).send({}).expect(400)).body).toEqual({
      error: 'Missing sheetId or tabName',
    })
    expect((await request(t.server).post('/api/export/sheets/metadata').set(json).send({}).expect(400)).body).toEqual({
      error: 'Missing sheetId',
    })
  })
  it('reports a missing Google configuration as an error message', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
    const t = await make()
    const r = await request(t.server).post('/api/export/sheets/metadata').set(json).send({ sheetId: 'x' }).expect(500)
    expect(r.body.error).toMatch(/GOOGLE_SERVICE_ACCOUNT_KEY_PATH/)
  })
})

describe('cross-cutting behaviour', () => {
  it('answers unknown routes with the established 404 body', async () => {
    const t = await make()
    expect((await request(t.server).get('/api/nope').expect(404)).body).toEqual({ error: 'Not Found' })
  })
  it('answers malformed JSON with a clean 400', async () => {
    const t = await make()
    const r = await request(t.server).post('/api/learn/mapping').set(json).send('{not json').expect(400)
    expect(r.body).toEqual({ error: 'Bad Request' })
  })
  it('sets security headers', async () => {
    const t = await make()
    const h = (await request(t.server).get('/health')).headers
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['x-frame-options']).toBeDefined()
    expect(h['x-powered-by']).toBeUndefined()
  })
  it('allows the custom header in CORS preflights', async () => {
    const t = await make()
    const r = await request(t.server)
      .options('/api/banking/connect')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-finkit,content-type')
    expect(String(r.headers['access-control-allow-headers']).toLowerCase()).toContain('x-finkit')
  })
  it('accepts large bodies (batch learn mappings)', async () => {
    const t = await make()
    const big = {
      mappings: Array.from({ length: 15000 }, (_, i) => ({ merchant: `Merchant number ${i}`, category: 'Other' })),
    }
    expect(JSON.stringify(big).length).toBeGreaterThan(500_000) // well above the default 100 kB limit
    await request(t.server).post('/api/learn/mappings/batch').set(json).send(big).expect(200)
  })
  it('never leaks internals on unexpected errors', async () => {
    const t = await make()
    t.db.exec('DROP TABLE merchant_categories') // makes the next query throw
    const r = await request(t.server).get('/api/learn/mappings').expect(500)
    expect(r.body).toEqual({ error: 'Internal Server Error' })
  })
})
