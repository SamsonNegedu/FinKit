import type { Transaction } from '@/shared/types'
import { parseLocalDate } from '@/shared/utils/dates'
import { getCategoryColor } from '@/shared/utils/categorizer'
import { analyze } from './analyze'

export interface MonthKey {
  year: number
  /** 0-11, as in Date */
  month: number
}
export interface CategoryMonthRow {
  category: string
  color: string
  /** Spent per month, in the same order as `months` */
  cells: number[]
  /** Mean of the months before the newest one; null when there is none to compare with */
  usual: number | null
}
export interface CategoryMonths {
  /** Oldest first, no gaps: a month with nothing spent still gets a column */
  months: MonthKey[]
  rows: CategoryMonthRow[]
  /** Investments and savings by month: money put away, so not part of what was spent */
  putAway: CategoryMonthRow[]
}

/**
 * Each category across the last few months, so a change in the monthly total can be traced to what caused it.
 * Spending is counted exactly as in `analyze`, so the columns add up to the same "Spent" figures elsewhere.
 */
export function categoryByMonth(transactions: Transaction[], count = 6): CategoryMonths {
  let newest = -1

  for (const t of transactions) {
    const d = parseLocalDate(t.date)

    newest = Math.max(newest, d.getFullYear() * 12 + d.getMonth())
  }
  if (newest < 0) {
    return { months: [], rows: [], putAway: [] }
  }
  const months = Array.from({ length: count }, (_, i) => {
    const index = newest - (count - 1 - i)

    return { year: Math.floor(index / 12), month: index % 12 }
  })
  const perMonth = months.map(m =>
    analyze(
      transactions.filter(t => {
        const d = parseLocalDate(t.date)

        return d.getFullYear() === m.year && d.getMonth() === m.month
      }),
      null,
      30,
    ),
  )
  const colors = new Map<string, string>()

  for (const a of perMonth) {
    for (const c of a.categories) {
      colors.set(c.category, c.color)
    }
  }
  const rows = [...colors].map(([category, color]) => {
    const cells = perMonth.map(a => a.categories.find(c => c.category === category)?.total ?? 0)
    const earlier = cells.slice(0, -1)
    // Months before the first transaction would drag the average down, so only months with data count
    const active = earlier.filter((_, i) => perMonth[i].spent > 0)

    return {
      category,
      color,
      cells,
      usual: active.length ? active.reduce((sum, n) => sum + n, 0) / active.length : null,
    }
  })

  const putAway = [...new Set(perMonth.flatMap(a => a.putAway.map(p => p.category)))].map(category => {
    const cells = perMonth.map(a => a.putAway.find(p => p.category === category)?.total ?? 0)
    const earlier = cells.slice(0, -1).filter(n => n > 0)

    return {
      category,
      color: getCategoryColor(category),
      cells,
      usual: earlier.length ? earlier.reduce((total, n) => total + n, 0) / earlier.length : null,
    }
  })

  return { months, rows: rows.sort((a, b) => sum(b.cells) - sum(a.cells)), putAway }
}

const sum = (cells: number[]) => cells.reduce((total, n) => total + n, 0)
