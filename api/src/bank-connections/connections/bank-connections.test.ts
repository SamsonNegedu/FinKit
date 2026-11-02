import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { randomBytes } from 'node:crypto'
import { SIGNED_IN_HEADERS as H, TEST_KEY, TestAppOptions, createTestApp } from '../../testing/test-app'
import { BankProvider, ProviderError } from '../providers/bank-provider'
import { DEFAULT_CONSENT_DAYS } from '../constants'
import { isoDaysFromNow } from '../../shared/constants/time'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []

async function make(options?: TestAppOptions) {
  const t = await createTestApp(options)

  open.push(t)

  return t
}
afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
})

const cookieOf = (res: request.Response) => String(res.headers['set-cookie']?.[0] ?? '').split(';')[0]
const loc = (res: request.Response) => String(res.headers.location ?? '')
const stateOf = (url: string) => new URL(url, 'http://x').searchParams.get('state')!
const idOf = (res: request.Response) => new URL(loc(res), 'http://x').searchParams.get('c')!

/** connect → test bank page → approve or deny → the bank's return. Resolves to the return response. */
async function connectBank(t: TestApp, bank = 'N26', extra: Record<string, unknown> = {}, approve = true) {
  const start = await request(t.server)
    .post('/api/banking/connect')
    .set(H)
    .send({ bank, ...extra })
    .expect(200)
  const decide = await request(t.server)
    .get(
      `/api/banking/mock-bank/decide?state=${encodeURIComponent(stateOf(start.body.url))}&d=${approve ? 'approve' : 'deny'}`,
    )
    .expect(302)

  return request(t.server).get(loc(decide)).set('Cookie', cookieOf(start))
}

describe('access control (production-style)', () => {
  const verify = async (t: string) => {
    if (t === 'me') {
      return { email: 'me@x.com' }
    }
    if (t === 'other') {
      return { email: 'other@x.com' }
    }
    throw new Error('bad')
  }
  const cloudflare = {
    CF_ACCESS_TEAM_DOMAIN: 't',
    CF_ACCESS_AUD: 'a',
    ALLOWED_USER_EMAILS: 'me@x.com,other@x.com',
  }
  const as = (token?: string) => (token ? { ...H, 'cf-access-jwt-assertion': token } : H)

  it('refuses every protected route without a valid token, and logs it', async () => {
    const t = await make({ env: cloudflare, verify })

    for (const [method, path] of [
      ['get', '/status'],
      ['get', '/banks'],
      ['post', '/connect'],
      ['get', '/connections'],
      ['get', '/transactions'],
      ['delete', '/transactions'],
      ['post', '/connections/x/sync'],
      ['delete', '/connections/x'],
      ['get', '/admin/overview'],
      ['get', '/admin/audit'],
    ] as const) {
      expect((await request(t.server)[method](`/api/banking${path}`).set(as())).status, `${method} ${path}`).toBe(401)
      expect(
        (await request(t.server)[method](`/api/banking${path}`).set(as('garbage'))).status,
        `${method} ${path} (bad token)`,
      ).toBe(401)
    }
    const refused = t.db.prepare("SELECT COUNT(*) AS n FROM bank_audit_log WHERE action = 'access.refused'").get() as {
      n: number
    }

    expect(refused.n).toBeGreaterThan(0)
  })

  it('lets listed people in and refuses everyone else, however valid their sign-in', async () => {
    const t = await make({
      env: cloudflare,
      verify: async x => ({
        email: x === 'stranger' ? 'stranger@x.com' : `${x}@x.com`,
      }),
    })

    await request(t.server).get('/api/banking/status').set(as('me')).expect(200)
    await request(t.server).get('/api/banking/status').set(as('other')).expect(200)
    await request(t.server).get('/api/banking/status').set(as('stranger')).expect(403)
  })

  it('keeps the bank return page public: it is guarded by its request, not by sign-in', async () => {
    const t = await make({ env: cloudflare, verify })
    const res = await request(t.server).get('/api/banking/callback?state=nope&code=x')

    expect(res.status).toBe(302)
    expect(loc(res)).toContain('bank=error')
  })

  it('does not expose the test bank page in production-style setups', async () => {
    const t = await make({
      env: {
        ...cloudflare,
        NODE_ENV: 'production',
        ALLOWED_ORIGIN: 'https://finkit.test',
        BANKING_PROVIDER: 'enablebanking',
        EB_APP_ID: 'x',
        EB_PRIVATE_KEY: 'k',
        BANKING_REDIRECT_URL: 'https://a.b/cb',
      },
      verify,
    })

    await request(t.server).get('/api/banking/mock-bank?state=x').expect(404)
  })
})

describe('banking fails closed', () => {
  it('is hidden when switched off', async () => {
    const t = await make({ env: { BANKING_PROVIDER: 'off' } })

    expect((await request(t.server).get('/api/banking/status').expect(200)).body).toEqual({ enabled: false })
    await request(t.server).post('/api/banking/connect').set(H).send({ bank: 'N26' }).expect(404)
    await request(t.server).get('/api/banking/connections').expect(404)
  })
  it('takes balances with it, since they only exist for synced transactions', async () => {
    const off = await make({ env: { BANKING_PROVIDER: 'off' } })

    for (const url of ['/api/banking/balances']) {
      expect([url, (await request(off.server).get(url)).status]).toEqual([url, 404])
    }
    const on = await make()

    for (const url of ['/api/banking/balances']) {
      expect([url, (await request(on.server).get(url)).status]).toEqual([url, 200])
    }
  })
  it('refuses the test bank in production', async () => {
    const t = await make({
      env: {
        NODE_ENV: 'production',
        ALLOWED_ORIGIN: 'https://finkit.test',
        BANKING_PROVIDER: 'mock',
        CF_ACCESS_TEAM_DOMAIN: 't',
        CF_ACCESS_AUD: 'a',
        ALLOWED_USER_EMAILS: 'me@x.com',
      },
      verify: async () => ({ email: 'me@x.com' }),
    })
    const signedIn = { 'Cf-Access-Jwt-Assertion': 'tok' }

    expect((await request(t.server).get('/api/banking/status').set(signedIn).expect(200)).body).toEqual({
      enabled: false,
    })
    await request(t.server).get('/api/banking/connections').set(signedIn).expect(503)
  })
  it('refuses to run in production without sign-in settings', async () => {
    await expect(
      make({
        env: {
          NODE_ENV: 'production',
          ALLOWED_ORIGIN: 'https://finkit.test',
          BANKING_PROVIDER: 'enablebanking',
          EB_APP_ID: 'x',
          EB_PRIVATE_KEY: 'k',
          BANKING_REDIRECT_URL: 'https://a.b/cb',
        },
      }),
    ).rejects.toThrow(/CF_ACCESS/)
  })
})

describe('changing requests', () => {
  it('need the custom header, and the right origin when one is set', async () => {
    const t = await make({ env: { ALLOWED_ORIGIN: 'https://finkit.example' } })
    const body = { bank: 'N26' }

    await request(t.server).post('/api/banking/connect').set('Content-Type', 'application/json').send(body).expect(403)
    await request(t.server)
      .post('/api/banking/connect')
      .set(H)
      .set('Origin', 'https://evil.example')
      .send(body)
      .expect(403)
    await request(t.server)
      .post('/api/banking/connect')
      .set(H)
      .set('Origin', 'https://finkit.example')
      .send(body)
      .expect(200)
  })
})

describe('connect flow with the test bank', () => {
  it('connects, lists safely, syncs, throttles and disconnects', async () => {
    const t = await make()
    const cb = await connectBank(t)

    expect(cb.status).toBe(302)
    expect(loc(cb)).toMatch(/^\/app\/banks\?bank=connected&c=[0-9a-f-]{36}$/)

    const list = (await request(t.server).get('/api/banking/connections').expect(200)).body

    expect(list.connections).toHaveLength(1)
    const c = list.connections[0]

    expect(c).toMatchObject({
      bank: 'N26',
      status: 'active',
      accounts: [{ label: '…4821', currency: 'EUR' }],
    })
    expect(JSON.stringify(list)).not.toMatch(/sessionId|secret|mock-/) // nothing credential-like reaches the browser

    const sync = (await request(t.server).post(`/api/banking/connections/${c.id}/sync`).set(H).send({}).expect(200))
      .body

    expect(sync.count).toBeGreaterThan(10)
    expect(sync.transactions[0]).toHaveProperty('externalId')
    // every transaction says where it came from, and the account id matches the one on the card
    expect(sync.transactions[0]).toMatchObject({
      bankName: 'N26',
      accountLabel: '…4821',
    })
    expect(sync.transactions[0].accountRef).toBe(c.accounts[0].id)
    expect(c.accounts[0].id).toMatch(/^[0-9a-f]{16}$/)
    const again = await request(t.server)
      .post(`/api/banking/connections/${c.id}/sync`)
      .set(H)
      .send({ from: sync.from, to: sync.to })

    expect(again.status).toBe(429)
    expect(again.body.error).toMatch(/wait/i)

    await request(t.server).delete(`/api/banking/connections/${c.id}`).set(H).expect(200)
    expect((await request(t.server).get('/api/banking/connections')).body.connections).toHaveLength(0)
  })

  it('returns the same transaction ids on every fetch and continues where the last sync stopped', async () => {
    const clock = { now: () => current }
    let current = new Date('2026-10-20T12:00:00Z')
    const t = await make({ clock })
    const id = idOf(await connectBank(t))
    const first = (await request(t.server).post(`/api/banking/connections/${id}/sync`).set(H).send({})).body

    current = new Date('2026-10-22T12:00:00Z')
    const second = (await request(t.server).post(`/api/banking/connections/${id}/sync`).set(H).send({})).body
    const firstAmounts = new Map(first.transactions.map((x: any) => [x.externalId, x.amount]))
    const overlap = second.transactions.filter((x: any) => firstAmounts.has(x.externalId))

    expect(overlap.length).toBeGreaterThan(0)
    for (const x of overlap) {
      expect(firstAmounts.get(x.externalId)).toBe(x.amount)
    }
    expect(second.from > first.from).toBe(true) // continued, not restarted
  })

  it('keeps no readable secrets or transactions in the connection tables', async () => {
    const t = await make()
    const id = idOf(await connectBank(t))

    await request(t.server).post(`/api/banking/connections/${id}/sync`).set(H).send({})
    const dump = JSON.stringify(
      ['bank_connections', 'bank_sync_log', 'bank_audit_log', 'bank_auth_states'].map(n =>
        t.db.prepare(`SELECT * FROM ${n}`).all(),
      ),
    )

    expect(dump).not.toMatch(/REWE|Netflix|Salary|Acme|Amazon|Shell/)
    expect(dump).not.toMatch(/mock-[0-9a-f]{16}/) // the session id only exists encrypted
    expect(
      (
        t.db.prepare('SELECT secret_blob FROM bank_connections').get() as {
          secret_blob: string
        }
      ).secret_blob.startsWith('v1.'),
    ).toBe(true)
  })

  it('handles a denied approval without creating a connection', async () => {
    const t = await make()

    expect(loc(await connectBank(t, 'N26', {}, false))).toBe('/app/banks?bank=error&reason=denied')
    expect((await request(t.server).get('/api/banking/connections')).body.connections).toHaveLength(0)
  })
  it('rejects unknown banks and malformed requests', async () => {
    const t = await make()

    await request(t.server).post('/api/banking/connect').set(H).send({ bank: 'Nope Bank' }).expect(400)
    await request(t.server).post('/api/banking/connect').set(H).send({}).expect(400)
    await request(t.server).post('/api/banking/connections/x/sync').set(H).send({ from: 'tomorrow' }).expect(400)
  })

  it('reconnecting replaces the old link and keeps the sync position', async () => {
    const t = await make()
    const first = idOf(await connectBank(t))

    await request(t.server).post(`/api/banking/connections/${first}/sync`).set(H).send({})
    const lastTo = t.store!.getConnection(first)!.last_sync_to
    const second = idOf(await connectBank(t, 'N26', { reconnect: first }))

    expect(t.store!.getConnection(first)!.status).toBe('replaced')
    expect(t.store!.getConnection(first)!.secret_blob).toBe('')
    expect(t.store!.getConnection(second)!.last_sync_to).toBe(lastTo)
    expect((await request(t.server).get('/api/banking/connections')).body.connections.map((c: any) => c.id)).toEqual([
      second,
    ])
  })
})

describe('connecting the same bank twice', () => {
  it('replaces the existing link instead of adding a duplicate', async () => {
    const t = await make()
    const first = idOf(await connectBank(t))
    const second = idOf(await connectBank(t)) // no reconnect flag: the server notices the bank is already connected

    expect(second).not.toBe(first)
    expect(t.store!.getConnection(first)!.status).toBe('replaced')
    expect((await request(t.server).get('/api/banking/connections')).body.connections.map((c: any) => c.id)).toEqual([
      second,
    ])
  })
  it('keeps different banks side by side', async () => {
    const t = await make()

    await connectBank(t, 'N26')
    await connectBank(t, 'Wise')
    expect(
      (await request(t.server).get('/api/banking/connections')).body.connections
        .map((c: { bank: string }) => c.bank)
        .toSorted(),
    ).toEqual(['N26', 'Wise'])
  })
})

describe('the return page cannot be forged', () => {
  async function start(t: TestApp) {
    const r = await request(t.server).post('/api/banking/connect').set(H).send({ bank: 'N26' }).expect(200)

    return { state: stateOf(r.body.url), cookie: cookieOf(r), res: r }
  }
  const count = (t: TestApp) =>
    (
      t.db.prepare('SELECT COUNT(*) n FROM bank_connections').get() as {
        n: number
      }
    ).n

  it('needs the cookie from the browser that started the connection', async () => {
    const t = await make()
    const { state } = await start(t)
    const code = new URL(
      loc(await request(t.server).get(`/api/banking/mock-bank/decide?state=${state}&d=approve`)),
      'http://x',
    ).searchParams.get('code')!

    expect(loc(await request(t.server).get(`/api/banking/callback?code=${code}&state=${state}`))).toContain(
      'reason=invalid',
    ) // no cookie
    expect(
      loc(
        await request(t.server)
          .get(`/api/banking/callback?code=${code}&state=${state}`)
          .set('Cookie', 'finkit_bank_state=other'),
      ),
    ).toContain('reason=invalid')
    expect(count(t)).toBe(0)
  })
  it('works once only', async () => {
    const t = await make()
    const { state, cookie } = await start(t)
    const decide = loc(await request(t.server).get(`/api/banking/mock-bank/decide?state=${state}&d=approve`))

    expect(loc(await request(t.server).get(decide).set('Cookie', cookie))).toContain('bank=connected')
    expect(loc(await request(t.server).get(decide).set('Cookie', cookie))).toMatch(/reason=(expired|invalid)/)
    expect(count(t)).toBe(1)
  })
  it('expires after ten minutes', async () => {
    const t = await make()
    const state = randomBytes(8).toString('hex')

    t.store!.createState({
      state,
      userId: 'u',
      bankName: 'N26',
      country: 'DE',
      ttlMs: -1000,
    })
    expect(
      loc(
        await request(t.server)
          .get(`/api/banking/callback?code=c&state=${state}`)
          .set('Cookie', `finkit_bank_state=${state}`),
      ),
    ).toContain('reason=expired')
  })
  it('sets an HttpOnly, SameSite cookie scoped to the banking path, with no caching', async () => {
    const t = await make()
    const { res } = await start(t)
    const c = String(res.headers['set-cookie'])

    expect(c).toMatch(/HttpOnly/i)
    expect(c).toMatch(/SameSite=Lax/i)
    expect(c).toMatch(/Path=\/api\/banking/)
    expect(c).toMatch(/Max-Age=600/)
    expect(res.headers['cache-control']).toBe('no-store')
  })
  it('is Secure in production', async () => {
    const stub: BankProvider = {
      name: 'mock',
      listBanks: async () => [{ name: 'B', country: 'DE', maxConsentDays: 90 }],
      startAuth: async () => ({ url: 'https://bank' }),
      completeAuth: async () => {
        throw new Error('x')
      },
      fetchTransactions: async () => [],
      fetchBalance: async () => null,
      revoke: async () => {},
    }
    const t = await make({
      env: {
        NODE_ENV: 'production',
        ALLOWED_ORIGIN: 'https://finkit.test',
        BANKING_PROVIDER: 'enablebanking',
        EB_APP_ID: 'x',
        EB_PRIVATE_KEY: 'k',
        BANKING_REDIRECT_URL: 'https://a.b/cb',
        CF_ACCESS_TEAM_DOMAIN: 't',
        CF_ACCESS_AUD: 'a',
        BANKING_ADMIN_EMAILS: 'a@b.c',
      },
      provider: stub,
      verify: async () => ({ email: 'a@b.c' }),
    })
    const r = await request(t.server)
      .post('/api/banking/connect')
      .set(H)
      .set('cf-access-jwt-assertion', 't')
      .set('Origin', 'https://finkit.test')
      .send({ bank: 'B' })
      .expect(200)

    expect(String(r.headers['set-cookie'])).toMatch(/Secure/i)
  })
})

describe('sync failures', () => {
  function failing(kind: 'consent_expired' | 'rate_limited' | 'unavailable'): BankProvider {
    return {
      name: 'mock',
      listBanks: async () => [{ name: 'B', country: 'DE', maxConsentDays: 180 }],
      startAuth: async p => ({ url: `/x?state=${p.state}` }),
      completeAuth: async () => ({
        sessionId: 's',
        accounts: [{ uid: 'u', stableId: 's', label: '…1' }],
        validUntil: isoDaysFromNow(DEFAULT_CONSENT_DAYS),
      }),
      fetchTransactions: async () => {
        throw new ProviderError('nope', kind)
      },
      fetchBalance: async () => null,
      revoke: async () => {},
    }
  }
  async function connected(kind: 'consent_expired' | 'rate_limited' | 'unavailable') {
    const t = await make({ provider: failing(kind) })
    const r = await request(t.server).post('/api/banking/connect').set(H).send({ bank: 'B' }).expect(200)
    const cb = await request(t.server)
      .get(`/api/banking/callback?code=c&state=${stateOf(r.body.url)}`)
      .set('Cookie', cookieOf(r))

    return { t, id: idOf(cb) }
  }
  const sync = (t: TestApp, id: string) => request(t.server).post(`/api/banking/connections/${id}/sync`).set(H).send({})

  it('marks the connection expired when the bank says access ended', async () => {
    const { t, id } = await connected('consent_expired')

    expect((await sync(t, id)).status).toBe(409)
    expect((await request(t.server).get('/api/banking/connections')).body.connections[0].status).toBe('expired')
    expect((await sync(t, id)).status).toBe(409)
  })
  it('reports rate limiting as 429', async () => {
    const { t, id } = await connected('rate_limited')

    expect((await sync(t, id)).status).toBe(429)
  })
  it('reports outages without leaking detail, and logs them', async () => {
    const { t, id } = await connected('unavailable')
    const r = await sync(t, id)

    expect(r.status).toBe(502)
    expect(JSON.stringify(r.body)).not.toContain('nope')
    expect((await request(t.server).get('/api/banking/admin/sync-log')).body.entries[0]).toMatchObject({
      status: 'failed',
      bank: 'B',
    })
  })
})

describe('back office (development mode)', () => {
  it('reports setup checks, sync stats and an audit trail', async () => {
    const t = await make()
    const id = idOf(await connectBank(t))

    await request(t.server).post(`/api/banking/connections/${id}/sync`).set(H).send({})
    const o = (await request(t.server).get('/api/banking/admin/overview').expect(200)).body

    expect(o.connections).toMatchObject({ total: 1, active: 1 })
    expect(o.syncs30d.ok).toBe(1)
    expect(o.checks.find((c: any) => c.id === 'access').ok).toBe(false) // development mode is flagged
    const actions = (await request(t.server).get('/api/banking/admin/audit')).body.entries.map((e: any) => e.action)

    expect(actions).toEqual(expect.arrayContaining(['connect.start', 'connect.complete', 'sync']))
  })
  it('can age a test connection to show the expiring and expired states', async () => {
    const t = await make()
    const id = idOf(await connectBank(t))

    await request(t.server).post(`/api/banking/admin/connections/${id}/expire`).set(H).expect(200)
    expect((await request(t.server).get('/api/banking/connections')).body.connections[0].status).toBe('expiring')
    await request(t.server).post(`/api/banking/admin/connections/${id}/expire?mode=expired`).set(H).expect(200)
    expect((await request(t.server).get('/api/banking/connections')).body.connections[0].status).toBe('expired')
  })
})

void TEST_KEY
