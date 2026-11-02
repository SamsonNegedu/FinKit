import type { Transaction } from '@/shared/types'
import { parseLocalDate } from '@/shared/utils/dates'
import { analyze } from './analyze'

export interface MonthRow {
  year: number
  /** 0-11, as in Date */
  month: number
  income: number
  spent: number
  setAside: number
  /** Income minus spent: what was kept, including what was put aside */
  kept: number
  /** Kept as a share of income; null when nothing came in */
  rate: number | null
}

/** The months you have data for, newest first, each with what came in, went out and was put aside. */
export function monthlySeries(transactions: Transaction[], limit = 12): MonthRow[] {
  const byMonth = new Map<string, Transaction[]>()

  for (const t of transactions) {
    const d = parseLocalDate(t.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`

    byMonth.set(key, [...(byMonth.get(key) ?? []), t])
  }

  return [...byMonth.entries()]
    .map(([key, rows]) => {
      const [year, month] = key.split('-').map(Number)
      const a = analyze(rows, null, 30)

      return {
        year,
        month,
        income: a.income,
        spent: a.spent,
        setAside: a.setAside,
        kept: a.income - a.spent,
        rate: a.income > 0 ? ((a.income - a.spent) / a.income) * 100 : null,
      }
    })
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, limit)
}
