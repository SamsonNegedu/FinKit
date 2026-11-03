import type { CategoryStyle } from './categoryStyle'

/** A person's own spending categories: the ones to pick from, and the ones put away. */
export interface CategoryList {
  active: string[]
  archived: string[]
  /** An icon and a color a category was given, by category name */
  style?: Record<string, CategoryStyle>
  /** Finer labels inside a category, by category name. They never change what the category adds up to. */
  details?: Record<string, string[]>
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/**
 * The list to use: the person's saved one, or else their sheet's categories. A category the sheet has gained since
 * is added to the active ones, unless it was archived on purpose. One the sheet has dropped stays, because the
 * person's list is theirs to change, and removing it would hide it from a past year's filters and charts.
 */
export function resolveCategories(fromSheet: string[], stored: CategoryList | null): CategoryList {
  if (!stored) {
    return { active: [...fromSheet], archived: [], style: {}, details: {} }
  }
  const known = [...stored.active, ...stored.archived]

  return {
    active: [...stored.active, ...fromSheet.filter(c => !known.some(k => same(k, c)))],
    archived: [...stored.archived],
    style: stored.style ?? {},
    details: stored.details ?? {},
  }
}

/** Whether a name is free to use as a new category: not empty, not too long, not one already there or reserved. */
export function newCategoryProblem(name: string, list: CategoryList, reserved: string[]): string | null {
  const clean = name.trim()

  if (!clean) {
    return 'Type a name.'
  }
  if (clean.length > 40) {
    return 'Use at most 40 characters.'
  }
  if (reserved.some(r => same(r, clean))) {
    return `${clean} is already built in.`
  }
  if (list.active.some(c => same(c, clean))) {
    return `${clean} is already a category.`
  }

  return null
}

/** The list with a subcategory added to a category, or the same list when it is already there (any letter case). */
export function withDetail(list: CategoryList, category: string, name: string): CategoryList {
  const clean = name.trim()
  const known = list.details?.[category] ?? []

  if (!clean || known.some(d => same(d, clean))) {
    return list
  }

  return { ...list, details: { ...list.details, [category]: [...known, clean] } }
}
