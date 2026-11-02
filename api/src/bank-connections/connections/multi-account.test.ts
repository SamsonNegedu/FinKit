import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, createTestApp } from '../../testing/test-app'
import { DEFAULT_CONSENT_DAYS } from '../constants'
import { isoDaysFromNow } from '../../shared/constants/time'
import { BankProvider, ProviderAccount } from '../providers/bank-provider'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []

afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
})

const acct = (id: string): ProviderAccount => ({ uid: `uid-${id}`, stableId: id, label: `…${id}`, currency: 'EUR' })
const cookieOf = (res: request.Response) => String(res.headers['set-cookie']?.[0] ?? '').split(';')[0]
const stateOf = (url: string) => new URL(url, 'http://x').searchParams.get('state')!

/** A bank whose login covers whichever accounts the person approved this time. */
function setup() {
  const approved: string[][] = []
  const read: string[] = []
  const provider: BankProvider = {
    name: 'mock',
    listBanks: async () => [{ name: 'B', country: 'DE', maxConsentDays: 180 }],
    startAuth: async p => ({ url: `/x?state=${p.state}` }),
    completeAuth: async () => ({
      sessionId: 's',
      accounts: approved.shift()!.map(acct),
      validUntil: isoDaysFromNow(DEFAULT_CONSENT_DAYS),
    }),
    fetchTransactions: async p => {
      read.push(p.account.stableId)

      return [
        {
          date: '2026-10-01',
          description: 'x',
          amount: -5,
          currency: 'EUR',
          externalId: `${p.account.stableId}:1`,
          rawData: {},
        },
      ]
    },
    fetchBalance: async () => null,
    revoke: async () => {},
  }

  return { provider, approved, read }
}

async function connect(t: TestApp) {
  const start = await request(t.server).post('/api/banking/connect').set(H).send({ bank: 'B' }).expect(200)
  const cb = await request(t.server)
    .get(`/api/banking/callback?code=c&state=${stateOf(start.body.url)}`)
    .set('Cookie', cookieOf(start))

  return new URL(String(cb.headers.location), 'http://x').searchParams.get('c')!
}
const connections = async (t: TestApp) => (await request(t.server).get('/api/banking/connections')).body.connections
const sync = (t: TestApp, id: string) => request(t.server).post(`/api/banking/connections/${id}/sync`).set(H).send({})
const unthrottle = (t: TestApp) => t.db.prepare('UPDATE bank_connections SET last_sync_started_at = NULL').run()

describe('connecting a bank again with only some of its accounts', () => {
  it('keeps the old link for the accounts the new one leaves out', async () => {
    const { provider, approved } = setup()
    const t = await createTestApp({ provider })

    open.push(t)
    approved.push(['1111', '2222'], ['2222'])
    const first = await connect(t)
    const second = await connect(t) // this time only one account was approved

    expect(t.store!.getConnection(first)!.status).toBe('active') // not replaced: it still holds 1111
    expect((await connections(t)).map((c: { id: string }) => c.id).toSorted()).toEqual([first, second].toSorted())
  })

  it('reads each account through one link only, so nothing is fetched twice', async () => {
    const { provider, approved, read } = setup()
    const t = await createTestApp({ provider })

    open.push(t)
    approved.push(['1111', '2222'], ['2222'])
    const first = await connect(t)
    const second = await connect(t)

    await sync(t, first).expect(200)
    expect(read).toEqual(['1111']) // 2222 belongs to the newer link
    read.length = 0
    unthrottle(t)
    await sync(t, second).expect(200)
    expect(read).toEqual(['2222'])
  })

  it('replaces the old links once a new one covers every account again, keeping the history', async () => {
    const { provider, approved } = setup()
    const t = await createTestApp({ provider })

    open.push(t)
    approved.push(['1111', '2222'], ['2222'], ['1111', '2222'])
    const first = await connect(t)
    const second = await connect(t)

    await sync(t, first).expect(200)
    await sync(t, second).expect(200)
    const third = await connect(t)

    expect((await connections(t)).map((c: { id: string }) => c.id)).toEqual([third])
    expect(t.store!.getConnection(first)!.status).toBe('replaced')
    expect(t.store!.getConnection(second)!.status).toBe('replaced')
    expect(t.db.prepare('SELECT DISTINCT connection_id FROM bank_transactions').all()).toEqual([
      { connection_id: third },
    ])
    expect(t.db.prepare('SELECT COUNT(*) AS n FROM bank_transactions').get()).toEqual({ n: 2 })
  })

  it('still replaces a link that has run out, whatever the new one covers', async () => {
    const { provider, approved } = setup()
    const t = await createTestApp({ provider })

    open.push(t)
    approved.push(['1111', '2222'], ['2222'])
    const first = await connect(t)

    t.db.prepare("UPDATE bank_connections SET status = 'expired'").run()
    const second = await connect(t)

    expect(t.store!.getConnection(first)!.status).toBe('replaced')
    expect((await connections(t)).map((c: { id: string }) => c.id)).toEqual([second])
  })
})
