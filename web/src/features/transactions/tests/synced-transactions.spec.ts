import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { categorizeWithRules } from '@/shared/utils/categorizer/categorizeWithRules'
import { detectDoubleBookings } from '@/shared/utils/double-booking'
import { findLearned, merchantKeyOf, setLearnedMappings } from '@/shared/utils/categorizer/learnedMappings'

// Shaped like bank-synced rows: no category, subcategory or transfer flag (Finanzguru supplied those)
const synced = (o: Partial<Transaction>): Transaction => ({
  id: 'x',
  type: 'expense',
  date: '2026-10-05',
  description: '',
  amount: -10,
  currency: 'EUR',
  rawData: { source: 'enablebanking' },
  ...o,
})

describe('categorizing bank-synced transactions', () => {
  it('categorizes from the counterparty name alone', () => {
    const [tx] = categorizeWithRules([synced({ recipient: 'REWE Markt GmbH', description: '' })])

    expect(tx.category).not.toBe('Other')
  })
  it('categorizes from remittance text when the bank sends no counterparty', () => {
    const [tx] = categorizeWithRules([synced({ description: 'KARTENZAHLUNG REWE SAGT DANKE 4711' })])

    expect(tx.category).not.toBe('Other')
  })
  it('leaves unknown merchants uncategorized instead of guessing', () => {
    const [tx] = categorizeWithRules([synced({ recipient: 'Zzyzx Qwerty', description: 'abc' })])

    expect(tx.category).toBe('Other')
  })
})

describe('merchant key for learned rules', () => {
  it('prefers the counterparty name so one rule covers every payment to it', () => {
    expect(merchantKeyOf({ recipient: 'REWE', description: 'KARTE 1' })).toBe('REWE')
  })
  it('gives every payment to the same card merchant the same key', () => {
    const a = merchantKeyOf({ description: 'KARTENZAHLUNG REWE SAGT DANKE 4711 12.10' })
    const b = merchantKeyOf({ description: 'Kartenzahlung REWE SAGT DANKE 0815 03.11.2026' })

    expect(a).toBe('REWE SAGT DANKE')
    expect(b).toBe(a)
  })
  it('keeps short or number-only descriptions as they are', () => {
    expect(merchantKeyOf({ description: '12345' })).toBe('12345')
  })
})

describe('internal transfers between synced accounts', () => {
  it('are recognised through the account IBAN', () => {
    const out = detectDoubleBookings([
      synced({ id: 'o', referenceAccount: 'DE01', recipientIban: 'DE02', amount: 50, description: 'x' }),
      synced({
        id: 'i',
        type: 'income',
        referenceAccount: 'DE02',
        recipientIban: 'DE01',
        amount: 50,
        description: 'y',
      }),
    ])

    expect(out.every(t => t.isTransfer)).toBe(true)
    expect(out.find(t => t.id === 'o')!.doubleBookingMatch).toBe('i')
  })
})

describe('PayPal payments', () => {
  const tx = {
    recipient: 'PayPal Europe S.a.r.l. et Cie S.C.A',
    description: '1052557565027/. Rebtel Networks AB, Ihr Einkauf bei Rebtel Networks AB',
  }

  it('use the shop, not PayPal, as the key', () => {
    expect(merchantKeyOf(tx)).toBe('Rebtel Networks AB')
  })
  it('match a rule made for the shop and ignore one made for PayPal', () => {
    setLearnedMappings([
      { merchant: 'PayPal Europe S.a.r.l. et Cie S.C.A', category: 'Shopping' },
      { merchant: 'Rebtel Networks AB', category: 'Phone' },
    ])

    expect(findLearned(synced(tx))?.category).toBe('Phone')
    setLearnedMappings([])
  })
  it('do not fall back to a rule made for PayPal', () => {
    setLearnedMappings([{ merchant: 'PayPal Europe S.a.r.l. et Cie S.C.A', category: 'Subscriptions' }])

    expect(findLearned(synced(tx))).toBeNull()
    setLearnedMappings([])
  })
})
