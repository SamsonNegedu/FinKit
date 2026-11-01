import { describe, it, expect } from 'vitest'
import { applyRates, baseCurrencyOf, foreignCurrenciesOf } from '@/shared/utils/rates'
import { applyAliases, displayNameOf } from '@/shared/utils/aliases'
import { tx } from './testFixtures'

describe('exchange rates', () => {
  const list = [
    tx({ id: '1', currency: 'EUR' }),
    tx({ id: '2', currency: 'EUR' }),
    tx({ id: '3', currency: 'USD', amount: 100 }),
  ]

  it('finds the base and foreign currencies', () => {
    expect(baseCurrencyOf(list)).toBe('EUR')
    expect(foreignCurrenciesOf(list, 'EUR')).toEqual(['USD'])
  })

  it('converts only when a rate is set and keeps the original', () => {
    expect(applyRates(list, 'EUR', {})[2].amount).toBe(100)
    const converted = applyRates(list, 'EUR', { USD: 0.9 })[2]
    expect(converted).toMatchObject({ amount: 90, currency: 'EUR', originalAmount: 100, originalCurrency: 'USD' })
  })
})

describe('aliases', () => {
  it('sets a display name without changing the merchant', () => {
    const [t] = applyAliases([tx({ id: '1', merchant: 'AMZN Mktp DE' })], {
      amzn_mktp_de: 'x',
      'amzn mktp de': 'Amazon',
    })
    expect(t.displayName).toBe('Amazon')
    expect(t.merchant).toBe('AMZN Mktp DE')
    expect(displayNameOf(t)).toBe('Amazon')
  })
})
