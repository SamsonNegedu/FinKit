export const DEFAULT_TRIP_CATEGORIES = [
  'Accommodation',
  'Transport',
  'Food & drink',
  'Activities',
  'Shopping',
  'Souvenir',
  'Other',
] as const

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Accommodation: ['Hotel', 'Hostel', 'Apartment', 'Campsite'],
  Transport: ['Flight', 'Train', 'Bus', 'Metro & tram', 'Taxi & rides', 'Car hire', 'Ferry', 'Fuel & parking'],
  'Food & drink': ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Coffee', 'Drinks', 'Groceries'],
  Activities: ['Tours', 'Tickets', 'Nightlife'],
}

export const FALLBACK = 'Other'

export const keyOf = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim()

/** Built-in categories plus custom ones that are not duplicates of a built-in spelling. */
export function tripCategoryList(customFromDb: string[]): string[] {
  const custom = customFromDb.filter(c => !DEFAULT_TRIP_CATEGORIES.some(d => keyOf(d) === keyOf(c)))

  return [...DEFAULT_TRIP_CATEGORIES, ...custom]
}

export function mergeDefaultSubcategories(
  used: Array<{ category: string; subcategory: string }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}

  for (const [category, names] of Object.entries(DEFAULT_SUBCATEGORIES)) {
    out[category] = [...names]
  }
  for (const { category, subcategory } of used) {
    const list = (out[category] ??= [])

    if (!list.some(s => keyOf(s) === keyOf(subcategory))) {
      list.push(subcategory)
    }
  }

  return out
}

export function resolveSubcategoryName(wanted: string | null | undefined, known: string[]): string | null {
  const name = wanted?.trim()

  if (!name) {
    return null
  }

  return known.find(s => keyOf(s) === keyOf(name)) ?? name
}
