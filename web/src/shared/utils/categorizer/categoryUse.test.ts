import { describe, expect, it } from 'vitest'
import { categoryUse, isUnused, otherUse } from './categoryUse'

const none = { transactions: new Map<string, number>(), budgets: [], rules: [], columns: [] }

describe('categoryUse', () => {
  it('finds nothing for a category nothing points at, which can then be deleted', () => {
    const use = categoryUse('Pets', { ...none, transactions: new Map([['Rent', 4]]), budgets: ['Rent'] })

    expect(isUnused(use)).toBe(true)
    expect(otherUse(use)).toBeNull()
  })

  it('counts transactions, budgets, rules and sheet columns, whatever the letter case', () => {
    const use = categoryUse('Pets', {
      transactions: new Map([['pets', 3]]),
      budgets: ['Pets'],
      rules: ['PETS', 'Pets'],
      columns: ['Pets'],
    })

    expect(use).toEqual({ transactions: 3, budgets: 1, rules: 2, columns: 1 })
    expect(isUnused(use)).toBe(false)
    expect(otherUse(use)).toBe('Also used by a budget, 2 rules, a sheet column')
  })

  it('does not call it unused because of a single transaction', () => {
    expect(isUnused(categoryUse('Pets', { ...none, transactions: new Map([['Pets', 1]]) }))).toBe(false)
  })
})
