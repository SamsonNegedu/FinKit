import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { SIGNED_IN_HEADERS as H, createTestApp } from '../testing/test-app'

type TestApp = Awaited<ReturnType<typeof createTestApp>>
const open: TestApp[] = []
const ALICE = 'alice@x.com'
const BOB = 'bob@x.com'
const as = (who: string) => ({ ...H, 'X-Dev-User': who })
const loc = (res: request.Response) => String(res.headers.location ?? '')
const cookieOf = (res: request.Response) => String(res.headers['set-cookie']?.[0] ?? '').split(';')[0]

async function make() {
  const t = await createTestApp({ env: { ALLOWED_USER_EMAILS: `${ALICE},${BOB}` } })

  open.push(t)

  return t
}
afterEach(async () => {
  while (open.length) {
    await open.pop()!.close()
  }
})

async function syncedRefs(t: TestApp, who: string): Promise<Array<{ ref: string; amount: number }>> {
  const start = await request(t.server).post('/api/banking/connect').set(as(who)).send({ bank: 'N26' }).expect(200)
  const state = new URL(start.body.url, 'http://x').searchParams.get('state')!
  const decide = await request(t.server)
    .get(`/api/banking/mock-bank/decide?state=${encodeURIComponent(state)}&d=approve`)
    .expect(302)
  const back = await request(t.server).get(loc(decide)).set('Cookie', cookieOf(start))
  const id = new URL(loc(back), 'http://x').searchParams.get('c')!

  await request(t.server).post(`/api/banking/connections/${id}/sync`).set(as(who)).send({}).expect(200)

  return (await request(t.server).get('/api/banking/transactions').set(as(who)).expect(200)).body.transactions
}

const month = (t: TestApp, who: string) => request(t.server).get('/api/banking/transactions').set(as(who)).expect(200)

const tripOf = async (t: TestApp, who: string, ref: string) =>
  ((await month(t, who)).body.transactions as Array<{ ref: string; tripId: string | null }>).find(x => x.ref === ref)
    ?.tripId

async function newTrip(t: TestApp, who: string, body: object = { name: 'Lisbon', location: 'Portugal' }) {
  return (await request(t.server).post('/api/trips').set(as(who)).send(body).expect(201)).body
}

describe('trips', () => {
  it('marks tagged transactions with their trip and frees them when removed', async () => {
    const t = await make()
    const refs = await syncedRefs(t, ALICE)
    const trip = await newTrip(t, ALICE)
    const [a, b] = refs

    await request(t.server)
      .post(`/api/trips/${trip.id}/items`)
      .set(as(ALICE))
      .send({
        items: [
          { ref: a.ref, kind: 'cost', category: 'Transport' },
          { ref: b.ref, kind: 'funding' },
        ],
      })
      .expect(204)

    expect(await tripOf(t, ALICE, a.ref)).toBe(trip.id)
    expect(await tripOf(t, ALICE, b.ref)).toBe(trip.id)

    await request(t.server)
      .post(`/api/trips/${trip.id}/items/remove`)
      .set(as(ALICE))
      .send({ refs: [a.ref] })
      .expect(204)
    expect(await tripOf(t, ALICE, a.ref)).toBeNull()

    await request(t.server).delete(`/api/trips/${trip.id}`).set(as(ALICE)).expect(204)
    expect(await tripOf(t, ALICE, b.ref)).toBeNull()
  })

  it('counts what came in, what went out and where, including bookings made before the trip', async () => {
    const t = await make()
    const refs = await syncedRefs(t, ALICE)
    const trip = await newTrip(t, ALICE, { name: 'Lisbon', location: 'Portugal', startDate: '2999-01-01' })
    const [cost, funding] = refs

    await request(t.server)
      .post(`/api/trips/${trip.id}/items`)
      .set(as(ALICE))
      .send({
        items: [
          { ref: cost.ref, kind: 'cost', category: 'accommodation' },
          { ref: funding.ref, kind: 'funding' },
        ],
      })
      .expect(204)

    const { totals, transactions } = (await request(t.server).get(`/api/trips/${trip.id}`).set(as(ALICE)).expect(200))
      .body
    const total = totals[0]

    expect(transactions).toHaveLength(2)
    expect(total.funded).toBeCloseTo(Math.abs(funding.amount), 2)
    expect(total.spent).toBeCloseTo(-cost.amount, 2)
    expect(total.byCategory[0].category).toBe('Accommodation')
    // Every mock transaction is dated before 2999, so it counts as planning
    expect(total.byPhase.before).toBeCloseTo(-cost.amount, 2)
  })

  it('keeps trips, transactions and categories per person', async () => {
    const t = await make()
    const [mine] = await syncedRefs(t, ALICE)
    const trip = await newTrip(t, ALICE)

    await request(t.server).get(`/api/trips/${trip.id}`).set(as(BOB)).expect(404)
    await request(t.server).delete(`/api/trips/${trip.id}`).set(as(BOB)).expect(404)
    await request(t.server)
      .post(`/api/trips/${trip.id}/items`)
      .set(as(BOB))
      .send({ items: [{ ref: mine.ref, kind: 'funding' }] })
      .expect(404)

    const bobTrip = await newTrip(t, BOB)

    await request(t.server)
      .post(`/api/trips/${bobTrip.id}/items`)
      .set(as(BOB))
      .send({ items: [{ ref: mine.ref, kind: 'funding' }] })
      .expect(400)
    await request(t.server).post('/api/trip-categories').set(as(ALICE)).send({ name: 'Visas' }).expect(204)
    expect((await request(t.server).get('/api/trip-categories').set(as(BOB))).body.categories).not.toContain('Visas')
    expect((await request(t.server).get('/api/trips').set(as(BOB))).body.trips).toHaveLength(1)
  })

  it('adds and removes categories, and falls back to Other for items that used one', async () => {
    const t = await make()
    const [a] = await syncedRefs(t, ALICE)
    const trip = await newTrip(t, ALICE)

    await request(t.server).post('/api/trip-categories').set(as(ALICE)).send({ name: 'Visas' }).expect(204)
    await request(t.server).post('/api/trip-categories').set(as(ALICE)).send({ name: 'visas' }).expect(400)
    await request(t.server).post('/api/trip-categories').set(as(ALICE)).send({ name: 'transport' }).expect(400)
    await request(t.server)
      .post(`/api/trips/${trip.id}/items`)
      .set(as(ALICE))
      .send({ items: [{ ref: a.ref, kind: 'cost', category: 'Visas' }] })
      .expect(204)
    await request(t.server).delete('/api/trip-categories/Transport').set(as(ALICE)).expect(400)
    await request(t.server).delete('/api/trip-categories/Visas').set(as(ALICE)).expect(204)

    const { transactions } = (await request(t.server).get(`/api/trips/${trip.id}`).set(as(ALICE))).body

    expect(transactions[0].tripCategory).toBe('Other')
    await request(t.server)
      .post(`/api/trips/${trip.id}/items`)
      .set(as(ALICE))
      .send({ items: [{ ref: a.ref, kind: 'cost', category: 'Visas' }] })
      .expect(400)
  })

  it('rejects an end date before the start date', async () => {
    const t = await make()

    await request(t.server)
      .post('/api/trips')
      .set(as(ALICE))
      .send({ name: 'x', location: 'y', startDate: '2026-09-10', endDate: '2026-09-01' })
      .expect(400)
  })

  it("keeps a budget, travelers and archived state, and keeps manual entries out of other people's trips", async () => {
    const t = await make()
    const trip = await newTrip(t, ALICE, {
      name: 'Lisbon',
      location: 'Lisbon, Porto',
      budget: 500,
      budgetCurrency: 'EUR',
      travelers: ['Sam'],
    })

    expect(trip).toMatchObject({ budget: 500, budgetCurrency: 'EUR', travelers: ['Sam'], archived: false })
    const updated = (
      await request(t.server).patch(`/api/trips/${trip.id}`).set(as(ALICE)).send({ archived: true }).expect(200)
    ).body

    expect(updated).toMatchObject({ archived: true, budget: 500 })
    await request(t.server)
      .post(`/api/trips/${trip.id}/entries`)
      .set(as(BOB))
      .send({ date: '2026-09-01', amount: 5, currency: 'EUR', note: 'x', category: 'Other' })
      .expect(404)
  })

  it('stores where, when-away details and who with only as ciphertext, and still returns them', async () => {
    const t = await make()
    const trip = await newTrip(t, ALICE, {
      name: 'Secret honeymoon',
      location: 'Reykjavik',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      travelers: ['Sam Smith'],
    })

    await request(t.server)
      .post(`/api/trips/${trip.id}/entries`)
      .set(as(ALICE))
      .send({
        date: '2026-09-02',
        amount: 40,
        currency: 'EUR',
        note: 'Dinner',
        category: 'Food & drink',
        place: 'Reykjavik',
        paidBy: 'Sam Smith',
      })
      .expect(201)

    // Read the database itself, not the API: nothing readable may be in the sealed columns
    const stored = JSON.stringify([
      t.db.prepare('SELECT name, location, travelers FROM trips').all(),
      t.db.prepare('SELECT place, paid_by FROM trip_items').all(),
    ])

    for (const secret of ['Secret honeymoon', 'Reykjavik', 'Sam Smith']) {
      expect(stored).not.toContain(secret)
    }
    // What the database sorts and totals by stays readable
    expect(t.db.prepare('SELECT start_date, end_date FROM trips').get()).toEqual({
      start_date: '2026-09-01',
      end_date: '2026-09-05',
    })
    const back = (await request(t.server).get('/api/trips').set(as(ALICE)).expect(200)).body.trips[0]

    expect(back).toMatchObject({ name: 'Secret honeymoon', location: 'Reykjavik' })
    const detail = (await request(t.server).get(`/api/trips/${trip.id}`).set(as(ALICE)).expect(200)).body

    expect(detail.trip.travelers).toEqual(['Sam Smith'])
    expect(detail.transactions[0]).toMatchObject({ place: 'Reykjavik', paidBy: 'Sam Smith' })
  })

  it('counts cash entries, places and days, and works out who owes whom on shared costs', async () => {
    const t = await make()
    const trip = await newTrip(t, ALICE, { name: 'Lisbon', location: 'Lisbon, Porto', travelers: ['Sam'] })
    const entry = (body: object) =>
      request(t.server)
        .post(`/api/trips/${trip.id}/entries`)
        .set(as(ALICE))
        .send({ currency: 'EUR', category: 'Food & drink', ...body })

    await entry({ date: '2026-09-02', amount: 40, note: 'Dinner', place: 'Lisbon', shared: true }).expect(201)
    await entry({ date: '2026-09-02', amount: 20, note: 'Taxi', place: 'Porto', shared: true, paidBy: 'Sam' }).expect(
      201,
    )
    await entry({ date: '2026-09-03', amount: 10, note: 'Snacks', paidBy: 'Sam' }).expect(201)
    await entry({ date: '2026-09-03', amount: 5, note: 'x', paidBy: 'Nobody' }).expect(400)

    const { totals, transactions } = (await request(t.server).get(`/api/trips/${trip.id}`).set(as(ALICE)).expect(200))
      .body
    const total = totals[0]

    expect(transactions.every((x: { manual: boolean }) => x.manual)).toBe(true)
    expect(total.spent).toBe(70)
    // You: half of dinner (20) + half of the taxi (10); the 10 of snacks paid by Sam and not shared is Sam's
    expect(total.mine).toBe(30)
    // Sam owes you 20 for dinner, you owe Sam 10 for the taxi
    expect(total.settlement).toEqual([{ name: 'Sam', amount: 10 }])
    expect(total.byPlace.map((p: { place: string }) => p.place).toSorted()).toEqual(['Lisbon', 'Not assigned', 'Porto'])
    expect(total.byDay).toEqual([
      { date: '2026-09-02', amount: 60 },
      { date: '2026-09-03', amount: 10 },
    ])
  })

  it('changing a category keeps the place and sharing that were set, and removing an entry deletes it', async () => {
    const t = await make()
    const trip = await newTrip(t, ALICE, { name: 'Lisbon', location: 'Lisbon', travelers: ['Sam'] })
    const { ref } = (
      await request(t.server)
        .post(`/api/trips/${trip.id}/entries`)
        .set(as(ALICE))
        .send({
          date: '2026-09-02',
          amount: 40,
          currency: 'EUR',
          note: 'Dinner',
          category: 'Food & drink',
          place: 'Lisbon',
          shared: true,
        })
        .expect(201)
    ).body

    await request(t.server)
      .post(`/api/trips/${trip.id}/items`)
      .set(as(ALICE))
      .send({ items: [{ ref, kind: 'cost', category: 'Activities' }] })
      .expect(204)
    const row = (await request(t.server).get(`/api/trips/${trip.id}`).set(as(ALICE))).body.transactions[0]

    expect(row).toMatchObject({ tripCategory: 'Activities', place: 'Lisbon', shared: true })
    await request(t.server)
      .post(`/api/trips/${trip.id}/items/remove`)
      .set(as(ALICE))
      .send({ refs: [ref] })
      .expect(204)
    expect((await request(t.server).get(`/api/trips/${trip.id}`).set(as(ALICE))).body.transactions).toHaveLength(0)
  })

  it('puts what each trip has cost on the list, for the owner only', async () => {
    const t = await make()
    const trip = await newTrip(t, ALICE)

    await request(t.server)
      .post(`/api/trips/${trip.id}/entries`)
      .set(as(ALICE))
      .send({ date: '2026-09-02', amount: 25, currency: 'EUR', note: 'Taxi', category: 'Transport' })
      .expect(201)
    const listed = async (who: string) =>
      (await request(t.server).get('/api/trips').set(as(who)).expect(200)).body.trips as Array<{
        totals: Array<{ currency: string; spent: number }>
      }>

    expect((await listed(ALICE))[0].totals).toMatchObject([{ currency: 'EUR', spent: 25 }])
    expect(await listed(BOB)).toEqual([])
  })

  describe('subcategories', () => {
    const entry = (t: TestApp, tripId: string, who: string, body: object) =>
      request(t.server)
        .post(`/api/trips/${tripId}/entries`)
        .set(as(who))
        .send({ date: '2026-09-02', currency: 'EUR', note: 'x', ...body })
    const detail = async (t: TestApp, tripId: string, who: string) =>
      (await request(t.server).get(`/api/trips/${tripId}`).set(as(who)).expect(200)).body

    it('offers built-in ones, splits a category by them, and lists what is left over', async () => {
      const t = await make()
      const trip = await newTrip(t, ALICE)

      const list = (await request(t.server).get('/api/trip-categories').set(as(ALICE)).expect(200)).body

      expect(list.categories).not.toContain('Snacks')
      expect(list.subcategories['Food & drink']).toEqual(expect.arrayContaining(['Breakfast', 'Dinner', 'Snacks']))
      expect(list.subcategories.Transport).toContain('Flight')
      await entry(t, trip.id, ALICE, { amount: 200, category: 'Transport', subcategory: 'flight' }).expect(201)
      await entry(t, trip.id, ALICE, { amount: 10, category: 'Transport', subcategory: 'Metro & tram' }).expect(201)
      await entry(t, trip.id, ALICE, { amount: 30, category: 'Transport' }).expect(201)

      const total = (await detail(t, trip.id, ALICE)).totals[0]

      expect(total.byCategory[0]).toMatchObject({ category: 'Transport', amount: 240 })
      // The spelling that matches a built-in one is used, and the 30 with no subcategory is not listed
      expect(total.bySubcategory).toEqual([
        { category: 'Transport', subcategory: 'Flight', amount: 200 },
        { category: 'Transport', subcategory: 'Metro & tram', amount: 10 },
      ])
    })

    it('clears the subcategory when the category changes, and keeps it when only the place changes', async () => {
      const t = await make()
      const trip = await newTrip(t, ALICE, { name: 'Lisbon', location: 'Lisbon, Porto' })
      const { ref } = (await entry(t, trip.id, ALICE, { amount: 20, category: 'Transport', subcategory: 'Train' })).body
      const tag = (item: object) =>
        request(t.server)
          .post(`/api/trips/${trip.id}/items`)
          .set(as(ALICE))
          .send({ items: [{ ref, kind: 'cost', ...item }] })
          .expect(204)

      await tag({ place: 'Porto' })
      expect((await detail(t, trip.id, ALICE)).transactions[0]).toMatchObject({
        tripSubcategory: 'Train',
        place: 'Porto',
      })
      await tag({ category: 'Transport' })
      expect((await detail(t, trip.id, ALICE)).transactions[0].tripSubcategory).toBe('Train')
      await tag({ category: 'Activities' })
      expect((await detail(t, trip.id, ALICE)).transactions[0].tripSubcategory).toBeNull()
      await tag({ category: 'Food & drink', subcategory: 'Dinner' })
      expect((await detail(t, trip.id, ALICE)).transactions[0].tripSubcategory).toBe('Dinner')
      await tag({ subcategory: null })
      expect((await detail(t, trip.id, ALICE)).transactions[0].tripSubcategory).toBeNull()
    })

    it('remembers one a person typed, for them only', async () => {
      const t = await make()
      const mine = await newTrip(t, ALICE)

      await entry(t, mine.id, ALICE, { amount: 5, category: 'Transport', subcategory: 'Cable car' }).expect(201)
      const subs = async (who: string) =>
        (await request(t.server).get('/api/trip-categories').set(as(who)).expect(200)).body.subcategories.Transport

      expect(await subs(ALICE)).toContain('Cable car')
      expect(await subs(BOB)).not.toContain('Cable car')
    })
  })
})
