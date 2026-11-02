import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, createTestApp, TestAppOptions } from '../../testing/test-app'
import { DEFAULT_CONSENT_DAYS } from '../constants'
import { isoDaysFromNow } from '../../shared/constants/time'
import { BankProvider, ProviderError } from '../providers/bank-provider'
import { pickBalance } from '../providers/enable-banking.provider'

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
const cookieOf = (res: request.Response) => String(res.headers['set-cookie']?.[0] ?? '').split(';')[0]
const stateOf = (url: string) => new URL(url, 'http://x').searchParams.get('state')!

async function connected(options: TestAppOptions = {}, bank = 'Wise') {
  const t = await createTestApp({ env, verify, ...options })

  open.push(t)
  const start = await request(t.server).post('/api/banking/connect').set(as('me')).send({ bank }).expect(200)
  const decide = await request(t.server)
    .get(`/api/banking/mock-bank/decide?state=${encodeURIComponent(stateOf(start.body.url))}&d=approve`)
    .expect(302)
  const cb = await request(t.server).get(String(decide.headers.location)).set('Cookie', cookieOf(start))
  const id = new URL(String(cb.headers.location), 'http://x').searchParams.get('c')!

  return { t, id }
}
const sync = (t: TestApp, id: string) =>
  request(t.server).post(`/api/banking/connections/${id}/sync`).set(as('me')).send({})
const balances = (t: TestApp, who = 'me') => request(t.server).get('/api/banking/balances').set(as(who))

describe('account balances', () => {
  it('are read when a person presses Sync, and shown per account to that person only', async () => {
    const { t, id } = await connected()

    expect((await balances(t)).body.balances).toEqual([]) // nothing until a sync
    await sync(t, id).expect(200)
    const mine = (await balances(t).expect(200)).body.balances

    expect(mine).toHaveLength(2) // the test Wise has two accounts
    expect(mine[0]).toMatchObject({ bank: 'Wise', connectionId: id })
    expect(typeof mine[0].amount).toBe('number')
    expect(mine.map((b: { currency: string }) => b.currency).toSorted()).toEqual(['EUR', 'USD'])
    expect((await balances(t, 'other')).body.balances).toEqual([])
  })

  it('are not read by the scheduled sync, which would spend the bank’s few background requests', async () => {
    const { t, id } = await connected()

    await sync(t, id).expect(200)
    t.db.prepare('DELETE FROM bank_balances').run()
    t.db.prepare('UPDATE bank_connections SET last_sync_started_at = NULL').run()
    await t.syncs!.syncDue(6)
    expect((await balances(t)).body.balances).toEqual([])
  })

  it('go when the bank is disconnected', async () => {
    const { t, id } = await connected()

    await sync(t, id).expect(200)
    await request(t.server).delete(`/api/banking/connections/${id}`).set(as('me')).expect(200)
    expect((await balances(t)).body.balances).toEqual([])
    expect(t.db.prepare('SELECT COUNT(*) AS n FROM bank_balances').get()).toEqual({ n: 0 })
  })

  it('never fail the sync when the bank will not give one', async () => {
    const provider: BankProvider = {
      name: 'mock',
      listBanks: async () => [{ name: 'B', country: 'DE', maxConsentDays: 180 }],
      startAuth: async p => ({ url: `/x?state=${p.state}` }),
      completeAuth: async () => ({
        sessionId: 's',
        accounts: [{ uid: 'u', stableId: 'a', label: '…1' }],
        validUntil: isoDaysFromNow(DEFAULT_CONSENT_DAYS),
      }),
      fetchTransactions: async () => [],
      fetchBalance: async () => {
        throw new ProviderError('nope', 'rejected', 422)
      },
      revoke: async () => {},
    }
    const t = await createTestApp({ env, verify, provider })

    open.push(t)
    const start = await request(t.server).post('/api/banking/connect').set(as('me')).send({ bank: 'B' }).expect(200)
    const cb = await request(t.server)
      .get(`/api/banking/callback?code=c&state=${stateOf(start.body.url)}`)
      .set('Cookie', cookieOf(start))
    const id = new URL(String(cb.headers.location), 'http://x').searchParams.get('c')!

    await sync(t, id).expect(200)
    expect((await balances(t)).body.balances).toEqual([])
  })

  it('are stored encrypted', async () => {
    const { t, id } = await connected()

    await sync(t, id).expect(200)
    const rows = JSON.stringify(t.db.prepare('SELECT * FROM bank_balances').all())

    expect(rows).not.toMatch(/"amount"|amount\\"|EUR|USD/)
  })

  it('count against the account’s daily requests like any other read', async () => {
    const { t, id } = await connected()

    await sync(t, id).expect(200)
    const used = (t.db.prepare('SELECT SUM(used) AS n FROM bank_request_budget').get() as { n: number }).n

    expect(used).toBe(4) // two accounts: a transactions read and a balance read each
  })
})

describe('choosing which balance to show', () => {
  const b = (type: string, amount: string, extra: object = {}) => ({
    balance_type: type,
    balance_amount: { amount, currency: 'EUR' },
    ...extra,
  })

  it('prefers the booked balance including today, then the closing one, then what is available', () => {
    expect(pickBalance([b('ITAV', '50'), b('CLBD', '100'), b('ITBD', '120')])).toMatchObject({
      amount: 120,
      type: 'ITBD',
    })
    expect(pickBalance([b('ITAV', '50'), b('CLBD', '100')])).toMatchObject({ amount: 100, type: 'CLBD' })
    expect(pickBalance([b('ITAV', '50')])).toMatchObject({ amount: 50 })
  })

  it('makes a debit balance negative, and skips what has no usable amount', () => {
    expect(pickBalance([b('CLBD', '30', { credit_debit_indicator: 'DBIT' })])!.amount).toBe(-30)
    expect(pickBalance([b('CLBD', 'abc'), { balance_type: 'ITBD' }])).toBeNull()
    expect(pickBalance([])).toBeNull()
  })
})
