import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, createTestApp, TestAppOptions } from '../../testing/test-app'
import { DEFAULT_CONSENT_DAYS } from '../constants'
import { isoDaysFromNow } from '../../shared/constants/time'
import { BankProvider, BankTransaction, ProviderError } from '../providers/bank-provider'
import { backfillAllowance, shrink } from './backfill-budget'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []

afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
})

const tx = (date: string): BankTransaction => ({
  date,
  description: 'x',
  amount: -5,
  currency: 'EUR',
  externalId: `id-${date}`,
  rawData: {},
})

interface Script {
  /** Dates the bank still remembers */
  have: string[]
  /** Pages one fetch takes (each one is a request) */
  pages?: number
  fail?: (from: string, to: string) => ProviderError | undefined
  calls: Array<{ from: string; to: string }>
}

function scripted(script: Script): BankProvider {
  return {
    name: 'mock',
    listBanks: async () => [{ name: 'B', country: 'DE', maxConsentDays: 180 }],
    startAuth: async p => ({ url: `/x?state=${p.state}` }),
    completeAuth: async () => ({
      sessionId: 's',
      accounts: [{ uid: 'u', stableId: 'acc', label: '…1' }],
      validUntil: isoDaysFromNow(DEFAULT_CONSENT_DAYS),
    }),
    fetchTransactions: async p => {
      for (let i = 0; i < (script.pages ?? 1); i++) {
        await p.beforeRequest?.()
      }
      script.calls.push({ from: p.from, to: p.to })
      const failure = script.fail?.(p.from, p.to)

      if (failure) {
        throw failure
      }

      return p.longest ? [tx(script.have.at(0)!)] : script.have.filter(d => d >= p.from && d <= p.to).map(tx)
    },
    fetchBalance: async () => null,
    revoke: async () => {},
  }
}

const cookieOf = (res: request.Response) => String(res.headers['set-cookie']?.[0] ?? '').split(';')[0]
const stateOf = (url: string) => new URL(url, 'http://x').searchParams.get('state')!

async function setup(script: Script, options: TestAppOptions = {}, headers: Record<string, string> = H) {
  const clock = { current: new Date('2026-11-02T03:00:00Z') }
  const t = await createTestApp({
    provider: scripted(script),
    clock: { now: () => clock.current },
    ...options,
    env: { BANKING_BACKFILL_PAUSE_MS: '0', ...options.env },
  })

  open.push(t)
  const start = await request(t.server).post('/api/banking/connect').set(headers).send({ bank: 'B' }).expect(200)
  const cb = await request(t.server)
    .get(`/api/banking/callback?code=c&state=${stateOf(start.body.url)}`)
    .set('Cookie', cookieOf(start))
  const id = new URL(String(cb.headers.location), 'http://x').searchParams.get('c')!

  // The first sync stores the newest history and sets where backfill starts
  await request(t.server).post(`/api/banking/connections/${id}/sync`).set(headers).send({}).expect(200)
  script.calls.length = 0

  const nextDay = () => (clock.current = new Date(clock.current.getTime() + 24 * 3600_000))
  const row = () => t.db.prepare('SELECT * FROM bank_connections WHERE id = ?').get(id) as Record<string, unknown>

  return { t, id, clock, nextDay, row }
}

describe('request allowance', () => {
  it('holds back what the day’s remaining scheduled syncs need', () => {
    const at = (iso: string, used: number) => backfillAllowance({ cap: 4, used, now: new Date(iso), autoSyncHours: 12 })

    expect(at('2026-11-02T03:00:00Z', 1)).toBe(2) // one more scheduled run today
    expect(at('2026-11-02T20:00:00Z', 2)).toBe(2) // none left today
    expect(at('2026-11-02T03:00:00Z', 4)).toBe(0)
    expect(at('2026-11-02T03:00:00Z', 9)).toBe(0) // never negative
    expect(backfillAllowance({ cap: 4, used: 1, now: new Date('2026-11-02T03:00:00Z'), autoSyncHours: 0 })).toBe(3)
  })

  it('halves a window down to a week and no further', () => {
    expect(shrink(90)).toBe(45)
    expect(shrink(10)).toBe(7)
    expect(shrink(7)).toBe(7)
  })
})

describe('history backfill', () => {
  it('walks back one window a day and stops after two empty ones', async () => {
    const script: Script = { have: ['2026-08-10', '2026-06-01', '2026-03-01'], calls: [] }
    const { t, id, nextDay, row } = await setup(script)

    expect(await t.backfill!.backfillDue()).toBe(1)
    expect(script.calls).toEqual([{ from: '2026-05-12', to: '2026-08-10' }])
    expect(await t.backfill!.backfillDue()).toBe(0) // one window a day
    expect(script.calls).toHaveLength(1)

    nextDay()
    await t.backfill!.backfillDue()
    nextDay()
    await t.backfill!.backfillDue()
    expect(row()).toMatchObject({ backfill_status: 'pending', backfill_empty: 1 })
    nextDay()
    await t.backfill!.backfillDue()
    expect(row()).toMatchObject({ backfill_status: 'done', backfill_reason: 'history_ended' })

    const calls = script.calls.length

    nextDay()
    await t.backfill!.backfillDue()
    expect(script.calls).toHaveLength(calls) // finished: no more requests
    // everything found was kept, once
    expect(t.db.prepare('SELECT COUNT(*) AS n FROM bank_transactions').get()).toEqual({ n: 3 })
    expect((await request(t.server).get('/api/banking/connections')).body.connections[0].history).toMatchObject({
      status: 'done',
      reason: 'history_ended',
    })
    expect(id).toBeTruthy()
  })

  it('treats a refusal for old dates as the end of the bank’s history, and never retries it', async () => {
    const script: Script = { have: ['2026-08-10'], calls: [] }
    const { t, nextDay, row } = await setup(script)

    script.fail = from => (from < '2026-06-01' ? new ProviderError('too old', 'rejected', 422) : undefined)

    await t.backfill!.backfillDue()
    expect(row()).toMatchObject({ backfill_status: 'done', backfill_reason: 'bank_limit' })
    nextDay()
    await t.backfill!.backfillDue()
    expect(script.calls).toHaveLength(1)
  })

  it('stays inside the day’s requests: a window that needs more pages is retried smaller', async () => {
    const script: Script = { have: ['2026-08-10', '2026-07-01'], calls: [] }
    const { t, nextDay, row } = await setup(script)

    script.pages = 3

    await t.backfill!.backfillDue()
    // 4 allowed, 1 used by the first sync, 1 held back for the next scheduled run: 2 left, 3 needed
    expect(script.calls).toHaveLength(0)
    expect(row()).toMatchObject({ backfill_status: 'pending', backfill_window_days: 45 })
    const used = (t.db.prepare('SELECT SUM(used) AS n FROM bank_request_budget').get() as { n: number }).n

    expect(used).toBeLessThanOrEqual(4)

    script.pages = 1
    nextDay()
    await t.backfill!.backfillDue()
    expect(script.calls).toEqual([{ from: '2026-06-26', to: '2026-08-10' }])
  })

  it('waits for the bank when it says to slow down, for background syncs too', async () => {
    const script: Script = { have: ['2026-08-10'], calls: [] }
    const { t, clock, nextDay, row } = await setup(script)

    script.fail = () => new ProviderError('slow', 'rate_limited', 429, 3 * 24 * 3600)

    await t.backfill!.backfillDue()
    expect(row().blocked_until).toBe('2026-11-05T03:00:00.000Z')
    expect(row()).toMatchObject({ backfill_status: 'pending' })

    nextDay()
    expect(await t.backfill!.backfillDue()).toBe(0)
    expect(script.calls).toHaveLength(1) // nothing asked while blocked
    expect(await t.syncs!.syncDue(6)).toBe(0)
    expect(script.calls).toHaveLength(1)

    clock.current = new Date('2026-11-06T03:00:00Z')
    script.fail = undefined
    expect(await t.backfill!.backfillDue()).toBe(1)
  })

  it('stops, without expiring the connection, when the bank wants a new sign-in', async () => {
    const script: Script = { have: ['2026-08-10'], calls: [] }
    const { t, row } = await setup(script)

    script.fail = () => new ProviderError('gone', 'consent_expired', 401)

    await t.backfill!.backfillDue()
    expect(row()).toMatchObject({ backfill_status: 'blocked', backfill_reason: 'needs_relink', status: 'active' })
  })

  it('never goes before the floor', async () => {
    const script: Script = { have: ['2015-01-20', '2026-08-10'], calls: [] }
    const { t, nextDay, row } = await setup(script)

    t.db.prepare("UPDATE bank_connections SET backfill_cursor = '2015-01-20', backfill_window_days = 90").run()
    await t.backfill!.backfillDue()
    expect(row()).toMatchObject({ backfill_cursor: '2015-01-01', backfill_status: 'done', backfill_reason: 'floor' })
    nextDay()
    await t.backfill!.backfillDue()
    expect(script.calls).toHaveLength(1)
  })
})

describe('backfill belongs to one person', () => {
  const verify = async (token: string) => ({ email: `${token}@x.com` })
  const env = { CF_ACCESS_TEAM_DOMAIN: 't', CF_ACCESS_AUD: 'a', ALLOWED_USER_EMAILS: 'me@x.com,other@x.com' }
  const as = (token: string) => ({ ...H, 'cf-access-jwt-assertion': token })

  it('stores what it finds under the owner and refuses anyone else’s restart', async () => {
    const script: Script = { have: ['2026-08-10', '2026-06-01'], calls: [] }
    const { t, id } = await setup(script, { env, verify }, as('me'))

    await t.backfill!.backfillDue()
    const owners = t.db.prepare('SELECT DISTINCT user_id FROM bank_transactions').all()

    expect(owners).toHaveLength(1)
    await request(t.server).post(`/api/banking/connections/${id}/backfill`).set(as('other')).expect(404)
    await request(t.server).post(`/api/banking/connections/${id}/backfill`).set(as('me')).expect(200)
    expect((await request(t.server).get('/api/banking/connections').set(as('other'))).body.connections).toHaveLength(0)
  })
})
