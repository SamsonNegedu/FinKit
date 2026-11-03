import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { carryOverEdits } from './carryOverEdits'

const tx = (id: string, over: Partial<Transaction> = {}): Transaction =>
  ({
    id,
    date: '2026-11-01',
    description: 'Shell',
    amount: 41.28,
    currency: 'EUR',
    type: 'expense',
    category: 'Other',
    rawData: {},
    ...over,
  }) as Transaction

describe('carryOverEdits', () => {
  it('keeps a note when the rows are worked out again', () => {
    const [out] = carryOverEdits([tx('a', { note: 'fuel for the trip' })], [tx('a')])

    expect(out.note).toBe('fuel for the trip')
  })

  it('keeps a category chosen by hand with its subcategory, but not one the app guessed', () => {
    const previous = [
      tx('manual', { category: 'Shopping', categoryDetail: 'Fashion', categorySource: 'manual' }),
      tx('guess', { category: 'Groceries', categorySource: 'learned' }),
    ]
    const [manual, guess] = carryOverEdits(previous, [tx('manual'), tx('guess', { category: 'Eating Out' })])

    expect(manual).toMatchObject({ category: 'Shopping', categoryDetail: 'Fashion', categorySource: 'manual' })
    expect(guess.category).toBe('Eating Out')
  })

  it('keeps a month the person chose and a manual exclusion', () => {
    const previous = [
      tx('a', { countsToMonth: '2026-12', countsToMonthSource: 'manual', isExcluded: true, excludedManually: true }),
    ]
    const [out] = carryOverEdits(previous, [tx('a')])

    expect(out).toMatchObject({ countsToMonth: '2026-12', countsToMonthSource: 'manual', isExcluded: true })
    expect(out.excludedManually).toBe(true)
  })

  it('leaves new rows as they are, and does not carry anything onto a split part', () => {
    const [fresh] = carryOverEdits([tx('a', { note: 'x' })], [tx('b')])
    const [part] = carryOverEdits([tx('p', { splitOf: 'a', note: 'x' })], [tx('p')])

    expect(fresh.note).toBeUndefined()
    expect(part.note).toBeUndefined()
  })
})
