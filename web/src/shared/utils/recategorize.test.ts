import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { recategorize } from './recategorize'

const tx = (id: string, over: Partial<Transaction> = {}): Transaction =>
  ({
    id,
    date: '2026-03-10',
    description: 'Card payment',
    amount: 20,
    currency: 'EUR',
    type: 'expense',
    category: 'Other',
    merchant: 'H&M',
    rawData: {},
    ...over,
  }) as Transaction

describe('recategorize with a subcategory', () => {
  it('sets it on the picked rows and carries it to the merchant’s other rows', () => {
    const rows = [tx('a'), tx('b'), tx('c', { merchant: 'Temu' })]
    const result = recategorize(rows, ['a'], 'Shopping', { categoryDetail: 'Fashion' })!

    expect(result.next.map(t => [t.category, t.categoryDetail])).toEqual([
      ['Shopping', 'Fashion'],
      ['Shopping', 'Fashion'],
      ['Other', undefined],
    ])
    expect(result.siblingCount).toBe(1)
  })

  it('changes only the subcategory when the category stays', () => {
    const rows = [tx('a', { category: 'Shopping', categoryDetail: 'Fashion' }), tx('b', { category: 'Shopping' })]
    const result = recategorize(rows, ['a'], 'Shopping', { categoryDetail: 'Gear' })!

    expect(result.next.map(t => t.categoryDetail)).toEqual(['Gear', 'Gear'])
  })

  it('clears the subcategory when a category is picked without one', () => {
    const rows = [tx('a', { category: 'Shopping', categoryDetail: 'Fashion' })]

    expect(recategorize(rows, ['a'], 'Gifts')!.next[0].categoryDetail).toBeUndefined()
  })

  it('leaves other rows alone when it is for this one only', () => {
    const rows = [tx('a'), tx('b')]
    const result = recategorize(rows, ['a'], 'Shopping', { categoryDetail: 'Gear' }, true)!

    expect(result.next[1].categoryDetail).toBeUndefined()
    expect(result.merchants).toEqual([])
  })
})
