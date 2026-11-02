import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { tripCandidates } from '../utils/tripCandidates'

const tx = (id: string, date: string, description: string, over: Partial<Transaction> = {}): Transaction =>
  ({ id, date, description, amount: 50, type: 'expense', category: 'Other', currency: 'EUR', ...over }) as Transaction

const refOf = (t: Transaction) => `ref-${t.id}`
const run = (rows: Transaction[], skipped: string[] = []) =>
  tripCandidates(rows, refOf, new Set(skipped), '2026-10-12', '2026-10-19')

describe('trip candidates', () => {
  it('finds spending inside the dates, with a guessed category', () => {
    const { inside } = run([tx('a', '2026-10-14', 'Ristorante Da Mario'), tx('b', '2026-10-20', 'Ristorante Da Mario')])

    expect(inside.map(c => [c.t.id, c.guess?.category])).toEqual([['a', 'Food & drink']])
  })

  it('offers every flight and stay paid before the trip, however long ago, nearest first, but not ordinary spending', () => {
    const { earlier } = run([
      tx('old', '2025-03-01', 'Lufthansa'),
      tx('flight', '2026-06-20', 'Ryanair'),
      tx('shop', '2026-08-02', 'Rewe Markt'),
      tx('hotel', '2026-08-01', 'Booking.com'),
    ])

    expect(earlier.map(c => c.t.id)).toEqual(['hotel', 'flight', 'old'])
  })

  it('leaves out skipped items, transfers, income and anything without a server ref', () => {
    const rows = [
      tx('skipped', '2026-10-14', 'Cafe'),
      tx('transfer', '2026-10-14', 'Cafe', { category: 'Transfer' }),
      tx('income', '2026-10-14', 'Refund', { type: 'income' }),
      tx('ok', '2026-10-14', 'Cafe'),
    ]
    const found = tripCandidates(
      rows,
      t => (t.id === 'ok' || t.id === 'skipped' ? `ref-${t.id}` : undefined),
      new Set(['ref-skipped']),
      '2026-10-12',
      '2026-10-19',
    )

    expect(found.inside.map(c => c.t.id)).toEqual(['ok'])
  })
})
