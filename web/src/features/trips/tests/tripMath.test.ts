import { describe, expect, it } from 'vitest'
import type { TripTotals } from '../api/trips.api'
import { combineTotals, moneyInBase, tripLength } from '../utils/tripMath'

const totals = (currency: string, spent: number): TripTotals => ({
  currency,
  funded: 0,
  spent,
  remaining: -spent,
  mine: spent,
  byCategory: [{ category: 'Food & drink', amount: spent, share: 100 }],
  bySubcategory: [{ category: 'Food & drink', subcategory: 'Dinner', amount: spent }],
  byPlace: [],
  byDay: [{ date: '2026-09-02', amount: spent }],
  byPhase: { before: 0, during: spent, after: 0 },
  settlement: [],
})

describe('combineTotals', () => {
  it('adds currencies together in the base currency using the entered rates', () => {
    const { combined, separate, converted } = combineTotals([totals('EUR', 100), totals('GBP', 50)], 'EUR', {
      GBP: 1.2,
    })

    expect(combined?.spent).toBe(160)
    expect(combined?.byCategory).toEqual([{ category: 'Food & drink', amount: 160, share: 100 }])
    expect(combined?.bySubcategory).toEqual([{ category: 'Food & drink', subcategory: 'Dinner', amount: 160 }])
    expect(combined?.byDay).toEqual([{ date: '2026-09-02', amount: 160 }])
    expect(separate).toEqual([])
    expect(converted).toEqual(['GBP'])
  })

  it('keeps a currency without a rate on its own instead of adding it unconverted', () => {
    const { combined, separate } = combineTotals([totals('EUR', 100), totals('USD', 50)], 'EUR', {})

    expect(combined?.spent).toBe(100)
    expect(separate.map(s => s.currency)).toEqual(['USD'])
  })
})

describe('tripLength', () => {
  it('counts both travel dates, and falls back to the days with spending', () => {
    expect(tripLength({ startDate: '2026-09-01', endDate: '2026-09-03' }, 9)).toBe(3)
    expect(tripLength({ startDate: null, endDate: null }, 4)).toBe(4)
  })
})

describe('moneyInBase', () => {
  const money = (currency: string, spent: number) => ({ currency, funded: 0, spent, remaining: -spent, mine: spent })

  it('adds what has a rate, and says when something was left out', () => {
    const all = moneyInBase([money('EUR', 100), money('GBP', 50), money('USD', 30)], 'EUR', { GBP: 1.2 })

    expect(all.spent).toBe(160)
    expect(all.partial).toBe(true)
    expect(all.budget(100, 'GBP')).toBe(120)
    expect(all.budget(100, 'USD')).toBeUndefined()
  })
})
