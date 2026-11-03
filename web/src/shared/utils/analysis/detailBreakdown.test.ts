import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { analyze } from './analyze'
import { detailsOf } from './detailBreakdown'

const tx = (amount: number, merchant: string, detail?: string): Transaction =>
  ({
    id: Math.random().toString(),
    date: '2026-03-10',
    description: merchant,
    amount,
    currency: 'EUR',
    type: 'expense',
    category: 'Shopping',
    categoryDetail: detail,
    merchant,
    rawData: {},
  }) as Transaction

describe('detailsOf', () => {
  it('splits a category by subcategory and then by merchant, with the unsorted last', () => {
    const rows = [tx(30, 'H&M', 'Fashion'), tx(20, 'C&A', 'Fashion'), tx(40, 'Temu', 'Gear'), tx(5, 'Kiosk')]
    const split = detailsOf(rows)

    expect(split.map(d => [d.detail, d.total])).toEqual([
      ['Fashion', 50],
      ['Gear', 40],
      [null, 5],
    ])
    expect(split[0].merchants.map(m => m.merchant)).toEqual(['H&M', 'C&A'])
  })

  it('shows no split for a category nobody refined', () => {
    expect(detailsOf([tx(30, 'H&M'), tx(20, 'C&A')])).toEqual([])
  })
})

describe('analyze with subcategories', () => {
  it('keeps the category total whole, so a subcategory never pollutes or hides its parent', () => {
    const a = analyze([tx(30, 'H&M', 'Fashion'), tx(40, 'Temu', 'Gear'), tx(5, 'Kiosk')], null, 30)

    expect(a.categories).toHaveLength(1)
    expect(a.categories[0].total).toBe(75)
    expect(a.categories[0].details.reduce((s, d) => s + d.total, 0)).toBe(75)
  })
})
