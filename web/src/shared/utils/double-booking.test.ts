import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { detectDoubleBookings } from './double-booking'

const MINE = 'DE02000000000000000010'
const SAVINGS = 'DE02000000000000007374'

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: Math.random().toString(),
    date: '2026-11-01',
    description: 'x',
    amount: 100,
    currency: 'EUR',
    type: 'expense',
    category: 'Other',
    recipient: 'Someone',
    rawData: {},
    ...over,
  }) as Transaction

/** The debit names the other account's IBAN; the credit arrives from an unrelated IBAN and a shouted, cut-short name. */
const transfer = (amount: number, over: { debitDate?: string; creditDate?: string } = {}) => [
  tx({
    type: 'expense',
    amount,
    date: over.debitDate ?? '2026-11-01',
    accountRef: 'a',
    referenceAccount: MINE,
    recipientIban: SAVINGS,
    recipient: 'Test Data',
  }),
  tx({
    type: 'income',
    amount,
    date: over.creditDate ?? '2026-11-01',
    accountRef: 'b',
    referenceAccount: SAVINGS,
    recipientIban: 'DE99UNRELATED5515',
    recipient: 'SAMSON OJOAGBADUA NEGE',
  }),
]
const byType = (rows: Transaction[], type: string) => rows.filter(t => t.type === type)

describe('transfers between your own accounts', () => {
  it('treats both legs as a transfer even when only one names an account of yours', () => {
    const out = detectDoubleBookings(transfer(700))

    expect(out.map(t => t.category)).toEqual(['Transfer', 'Transfer'])
    expect(byType(out, 'income')[0].isExcluded).toBe(true) // not counted as income
    expect(out[0].doubleBookingMatch).toBe(out[1].id)
  })

  it('pairs legs a few days apart, and not ones further apart or for another amount', () => {
    const slow = detectDoubleBookings(transfer(200, { creditDate: '2026-11-03' }))

    expect(slow.map(t => t.category)).toEqual(['Transfer', 'Transfer'])
    const late = detectDoubleBookings(transfer(200, { creditDate: '2026-11-09' }))

    expect(late[1].category).toBe('Other') // too far apart to be the same transfer
    const rows = transfer(200)

    rows[1] = { ...rows[1], amount: 199 }
    expect(detectDoubleBookings(rows)[1].category).toBe('Other')
  })

  it('does not call a credit on the same account a transfer', () => {
    const rows = transfer(300)

    rows[1] = { ...rows[1], accountRef: 'a' }
    expect(detectDoubleBookings(rows)[1].category).toBe('Other')
  })

  it('recognises you by name elsewhere once a transfer shows it, however the bank wrote it', () => {
    const rows = [
      ...transfer(700),
      tx({ type: 'expense', amount: 55, recipient: 'Samson Ojoagbadua Negedu', accountRef: 'a' }),
      tx({ type: 'income', amount: 12, recipient: 'SAMSON OJOAGBADUA', accountRef: 'a' }),
      tx({ type: 'expense', amount: 200, recipient: 'Samson Negedu', accountRef: 'a' }), // no middle name
      tx({ type: 'expense', amount: 20, recipient: 'Rewe', accountRef: 'a' }),
    ]
    const out = detectDoubleBookings(rows)

    expect(out[2].category).toBe('Transfer') // a payment to yourself at an account that is not connected
    expect(out[3].category).toBe('Transfer')
    expect(out[4].category).toBe('Transfer') // the same person without the middle name
    expect(out[5].category).toBe('Other') // an ordinary payee is left alone
  })
})
