import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { selectionTotals } from './selectionTotal'

const tx = (id: string, type: 'income' | 'expense', amount: number, over: Partial<Transaction> = {}) =>
  ({ id, type, amount, date: '2026-10-31', description: id, currency: 'EUR', rawData: {}, ...over }) as Transaction

describe('selectionTotals', () => {
  const rows = [tx('a', 'expense', 10.37), tx('b', 'income', 4.87), tx('c', 'income', 6.27), tx('d', 'expense', 7)]

  it('adds up only what is selected, income against spending', () => {
    const [t] = selectionTotals(rows, new Set(['a', 'b', 'c']), 'EUR')

    expect(t.incoming).toBeCloseTo(11.14)
    expect(t.outgoing).toBeCloseTo(10.37)
    expect(t.net).toBeCloseTo(0.77)
  })

  it('is negative when more went out, and empty for nothing selected', () => {
    expect(selectionTotals(rows, new Set(['a', 'd']), 'EUR')[0].net).toBeCloseTo(-17.37)
    expect(selectionTotals(rows, new Set(), 'EUR')).toEqual([])
  })

  it('keeps a currency without a rate apart, base first', () => {
    const mixed = [tx('u', 'income', 2800, { currency: 'USD' }), tx('e', 'expense', 40)]
    const totals = selectionTotals(mixed, new Set(['u', 'e']), 'EUR')

    expect(totals.map(t => [t.currency, t.net])).toEqual([
      ['EUR', -40],
      ['USD', 2800],
    ])
  })

  it('counts an excluded transaction that is selected', () => {
    expect(selectionTotals([tx('x', 'expense', 5, { isExcluded: true })], new Set(['x']), 'EUR')[0].outgoing).toBe(5)
  })
})
