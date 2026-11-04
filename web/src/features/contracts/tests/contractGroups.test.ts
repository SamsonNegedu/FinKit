import { describe, expect, it } from 'vitest'
import type { Contract } from '../api/contracts.api'
import { groupContracts, type ToBase } from '../utils/contractGroups'

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
  lastDate: null,
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

const eurOnly: ToBase = (v, c) => (c === 'EUR' ? v : null)

describe('groupContracts', () => {
  it('puts the dearest group first and sums each one', () => {
    const { groups } = groupContracts(
      [
        make({ name: 'Netflix', group: 'Subscriptions', monthly: 10 }),
        make({ name: 'Rent', group: 'Rent', monthly: 900 }),
        make({ name: 'Spotify', group: 'Subscriptions', monthly: 12 }),
      ],
      eurOnly,
    )

    expect(groups.map(g => [g.name, g.monthly])).toEqual([
      ['Rent', 900],
      ['Subscriptions', 22],
    ])
    expect(groups[1].contracts.map(c => c.name)).toEqual(['Spotify', 'Netflix'])
  })

  it('keeps ended and dismissed contracts out of the groups', () => {
    const { groups, ended, dismissed } = groupContracts(
      [
        make({ name: 'Old gym', active: false }),
        make({ name: 'Nope', state: 'dismissed' }),
        make({ name: 'Rent', group: 'Rent' }),
      ],
      eurOnly,
    )

    expect(groups.flatMap(g => g.contracts.map(c => c.name))).toEqual(['Rent'])
    expect(ended.map(c => c.name)).toEqual(['Old gym'])
    expect(dismissed.map(c => c.name)).toEqual(['Nope'])
  })

  it('counts another currency in a group only when it has a rate', () => {
    const rows = [
      make({ name: 'US cloud', currency: 'USD', group: 'Subscriptions', monthly: 10 }),
      make({ name: 'Netflix', group: 'Subscriptions', monthly: 10 }),
    ]

    expect(groupContracts(rows, eurOnly).groups[0].monthly).toBe(10)
    expect(groupContracts(rows, (v, c) => (c === 'USD' ? v * 0.9 : v)).groups[0].monthly).toBe(19)
    expect(groupContracts(rows, eurOnly).groups[0].contracts).toHaveLength(2) // still listed, just not summed
  })
})
