import { describe, expect, it } from 'vitest'
import { getCategoryColor } from './categoryMeta'
import { setCategoryStyles } from './categoryStyle'
import { newCategoryProblem, resolveCategories, withDetail } from './categoryList'

describe('resolveCategories', () => {
  it('uses the sheet’s categories until the person has a list of their own', () => {
    expect(resolveCategories(['Rent', 'Car'], null)).toEqual({
      active: ['Rent', 'Car'],
      archived: [],
      style: {},
      details: {},
    })
  })

  it('keeps their list, adds what the sheet gained, and does not bring back what they archived', () => {
    const stored = { active: ['Rent', 'Gym'], archived: ['Radio Tax'] }

    expect(resolveCategories(['Rent', 'Radio Tax', 'Pets'], stored)).toEqual({
      active: ['Rent', 'Gym', 'Pets'],
      archived: ['Radio Tax'],
      style: {},
      details: {},
    })
  })

  it('keeps one the sheet has dropped, since it may still hold a past year', () => {
    expect(resolveCategories(['Rent'], { active: ['Rent', 'Travel'], archived: [] }).active).toEqual(['Rent', 'Travel'])
  })
})

describe('newCategoryProblem', () => {
  const list = { active: ['Rent'], archived: ['Radio Tax'] }

  it('accepts a new name and refuses empty, long, repeated or built-in ones', () => {
    expect(newCategoryProblem('Pets', list, ['Savings'])).toBeNull()
    expect(newCategoryProblem('  ', list, [])).not.toBeNull()
    expect(newCategoryProblem('x'.repeat(41), list, [])).not.toBeNull()
    expect(newCategoryProblem('rent', list, [])).not.toBeNull()
    expect(newCategoryProblem('savings', list, ['Savings'])).not.toBeNull()
  })

  it('lets an archived name through, to be restored', () => {
    expect(newCategoryProblem('Radio Tax', list, [])).toBeNull()
  })
})

describe('category styles', () => {
  it('keeps the icon and color a person chose through the merge', () => {
    const stored = { active: ['Pets'], archived: [], style: { Pets: { icon: 'paw-print', color: '#a855f7' } } }

    expect(resolveCategories([], stored).style).toEqual(stored.style)
    expect(resolveCategories(['Rent'], null).style).toEqual({})
  })

  it('uses the chosen color for a category, and the default again once it is cleared', () => {
    const before = getCategoryColor('Pets')

    setCategoryStyles({ Pets: { color: '#a855f7' } })
    expect(getCategoryColor('Pets')).toBe('#a855f7')
    setCategoryStyles({})
    expect(getCategoryColor('Pets')).toBe(before)
  })
})

describe('withDetail', () => {
  const list = { active: ['Shopping'], archived: [], details: { Shopping: ['Fashion'] } }

  it('adds a subcategory inside its category', () => {
    expect(withDetail(list, 'Shopping', ' Gear ').details).toEqual({ Shopping: ['Fashion', 'Gear'] })
    expect(withDetail({ active: ['Shopping'], archived: [] }, 'Shopping', 'Gear').details).toEqual({
      Shopping: ['Gear'],
    })
  })

  it('returns the same list for a repeat in any letter case, or an empty name', () => {
    expect(withDetail(list, 'Shopping', 'fashion')).toBe(list)
    expect(withDetail(list, 'Shopping', '  ')).toBe(list)
  })
})
