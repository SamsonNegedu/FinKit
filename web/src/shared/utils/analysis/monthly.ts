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
  /** Paid into the Investment category: recorded payments, put away for good */
  invested: number
  /** Paid into the Savings category */
  saved: number
  /** What is left of income after spending, investing and saving. Worked out, not recorded: it may be in an account or spent where nothing was tracked. */
  leftOver: number
  /** Invested as a share of income; null when nothing came in */
  investedRate: number | null
}

/** The months you have data for, newest first, each with what came in, went out, was invested and saved. */
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
        invested: a.invested,
        saved: a.saved,
        leftOver: a.income - a.spent - a.invested - a.saved,
        investedRate: a.income > 0 ? (a.invested / a.income) * 100 : null,
      }
    })
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, limit)
}
