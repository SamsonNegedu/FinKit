import { describe, expect, it } from 'vitest'
import { merchantFromDescription, shopBehindProcessor } from './merchantFromDescription'

describe('merchantFromDescription', () => {
  it.each([
    ['CARD-4239332286 Card transaction of 5.50 GBP issued by Cooplands Bakery', 'Cooplands Bakery'],
    ['1052557565027/. Rebtel Networks AB, Ihr Einkauf bei Rebtel Networks AB', 'Rebtel Networks AB'],
    ['Paid by card, issued by Spar City Tower Ltd', 'Spar City Tower Ltd'],
    ['Zahlung bei REWE 123456 Köln', 'REWE'],
  ])('%s', (description, expected) => {
    expect(merchantFromDescription(description)).toBe(expected)
  })

  it('does not match inside other words', () => {
    expect(merchantFromDescription('Nearby Standby fee')).toBeUndefined()
  })

  it('returns nothing without a marker', () => {
    expect(merchantFromDescription('FEE-CARD-4239332286 Wise Charges for: CA')).toBeUndefined()
  })
})

describe('shopBehindProcessor', () => {
  it('names the shop behind Klarna', () => {
    expect(shopBehindProcessor({ recipient: 'Klarna Bank AB', description: 'Purchase at Back Market' })).toBe(
      'Back Market',
    )
  })

  it('names the shop behind PayPal', () => {
    expect(
      shopBehindProcessor({
        recipient: 'PayPal Europe S.a.r.l. et Cie S.C.A',
        description: 'x. Ihr Einkauf bei Apple Services',
      }),
    ).toBe('Apple Services')
  })

  it('leaves other payees alone', () => {
    expect(shopBehindProcessor({ recipient: 'REWE', description: 'Purchase at Back Market' })).toBeUndefined()
  })
})
