import { describe, expect, it } from 'vitest'
import type { Contract, ContractTotals } from '../api/contracts.api'
import { combineTotals, insightsOf } from '../utils/contractInsights'

const make = (over: Partial<Contract>): Contract => ({
  id: over.name ?? 'x',
  state: 'detected',
  currency: 'EUR',
  name: 'x',
  payee: null,
  group: 'Other',
  groupSource: 'none',
  kind: 'fixed',
  frequency: 'monthly',
  amount: 10,
  monthly: 10,
  lastAmount: 10,
  firstDate: null,
  lastDate: '2026-10-01',
  nextExpected: null,
  count: 3,
  active: true,
  priceChange: null,
  note: null,
  linked: false,
  kmPerYear: null,
  costPerKm: null,
  foundAt: null,
  isNew: false,
  ...over,
})
const TODAY = '2026-11-10'

describe('insightsOf', () => {
  it('lists what is due in the next two weeks, soonest first, and what is left this month', () => {
    const r = insightsOf(
      [
        make({ name: 'B', nextExpected: '2026-11-20', amount: 30 }),
        make({ name: 'A', nextExpected: '2026-11-12', amount: 20 }),
        make({ name: 'Far', nextExpected: '2026-12-15' }),
        make({ name: 'Past', nextExpected: '2026-11-01' }),
        make({ name: 'Ended', nextExpected: '2026-11-15', active: false }),
        make({ name: 'US', nextExpected: '2026-11-15', currency: 'USD', amount: 99 }),
      ],
      TODAY,
      'EUR',
    )

    expect(r.upcoming.map(u => u.contract.name)).toEqual(['A', 'US', 'B'])
    expect(r.leftThisMonth).toBe(50) // A and B in EUR; USD and ended ones are left out
  })

  it('flags price rises, new finds and recent endings, but not drops or dismissed ones', () => {
    const r = insightsOf(
      [
        make({ name: 'Up', priceChange: { from: 10, to: 12 } }),
        make({ name: 'Down', priceChange: { from: 12, to: 10 } }),
        make({ name: 'New', isNew: true }),
        make({ name: 'Confirmed', isNew: true, state: 'confirmed' }),
        make({ name: 'Gone', active: false, lastDate: '2026-08-01' }),
        make({ name: 'Ancient', active: false, lastDate: '2025-01-01' }),
        make({ name: 'Hidden', state: 'dismissed', priceChange: { from: 1, to: 2 }, isNew: true }),
      ],
      TODAY,
      'EUR',
    )

    expect(r.rises.map(c => c.name)).toEqual(['Up'])
    expect(r.fresh.map(c => c.name)).toEqual(['New'])
    expect(r.ended.map(c => c.name)).toEqual(['Gone'])
  })
})

describe('combineTotals', () => {
  const eur: ContractTotals = { currency: 'EUR', monthly: 100, fixed: 80, variable: 20, byGroup: { Rent: 100 } }
  const usd: ContractTotals = { currency: 'USD', monthly: 10, fixed: 10, variable: 0, byGroup: { Rent: 10 } }

  it('adds in currencies you gave a rate for, and keeps the rest apart', () => {
    const withRate = combineTotals([eur, usd], 'EUR', { USD: 0.9 })

    expect(withRate.combined).toMatchObject({ monthly: 109, fixed: 89, byGroup: { Rent: 109 } })
    expect(withRate.unconverted).toEqual([])
    expect(combineTotals([eur, usd], 'EUR', {}).unconverted).toEqual([usd])
    expect(combineTotals([eur, usd], 'EUR', {}).combined.monthly).toBe(100)
  })
})
