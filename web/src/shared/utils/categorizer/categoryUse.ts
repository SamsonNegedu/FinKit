export interface CategoryUse {
  transactions: number
  budgets: number
  rules: number
  columns: number
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const countOf = (names: string[], category: string) => names.filter(n => same(n, category)).length

/** Everything that still points at a category: its transactions, budgets, rules and sheet columns. */
export function categoryUse(
  category: string,
  found: { transactions: Map<string, number>; budgets: string[]; rules: string[]; columns: string[] },
): CategoryUse {
  return {
    transactions: [...found.transactions].filter(([c]) => same(c, category)).reduce((sum, [, n]) => sum + n, 0),
    budgets: countOf(found.budgets, category),
    rules: countOf(found.rules, category),
    columns: countOf(found.columns, category),
  }
}

/** A category can be deleted only when nothing points at it; otherwise it can only be archived. */
export const isUnused = (use: CategoryUse) => use.transactions + use.budgets + use.rules + use.columns === 0

/** What still uses it, apart from its transactions (those are counted in the row), or null when nothing else does. */
export function otherUse(use: CategoryUse): string | null {
  const parts = [
    use.budgets > 0 && (use.budgets === 1 ? 'a budget' : `${use.budgets} budgets`),
    use.rules > 0 && (use.rules === 1 ? 'a rule' : `${use.rules} rules`),
    use.columns > 0 && (use.columns === 1 ? 'a sheet column' : `${use.columns} sheet columns`),
  ].filter(Boolean)

  return parts.length > 0 ? `Also used by ${parts.join(', ')}` : null
}
