import { AnalysisSummary, DateRange, Transaction } from '../types'
import { displayNameOf } from './aliases'
import { getCategoryColor } from './categorizer'
import { parseLocalDate } from './dates'

/** Transactions inside the chosen period (all of them when no period is set). */
export function inPeriod(transactions: Transaction[], range: DateRange | null): Transaction[] {
  if (!range) return transactions
  return transactions.filter(tx => {
    const d = parseLocalDate(tx.date)
    return d >= range.startDate && d <= range.endDate
  })
}

/** Totals, category breakdown and top merchants for a set of transactions. Transfers between your own accounts are left out. */
export function summarize(transactions: Transaction[], range: DateRange | null, currency: string): AnalysisSummary {
  const counted = transactions.filter(tx => tx.category !== 'Transfer' && !tx.isExcluded)
  const expenses = counted.filter(tx => tx.type === 'expense')
  const income = counted.filter(tx => tx.type === 'income')
  const totalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0)
  const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0)

  const byCategory = new Map<string, { total: number; count: number }>()
  const byMerchant = new Map<string, { total: number; count: number }>()
  for (const tx of expenses) {
    const category = tx.category || 'Other'
    const c = byCategory.get(category) ?? { total: 0, count: 0 }
    byCategory.set(category, { total: c.total + tx.amount, count: c.count + 1 })
    const merchant = displayNameOf(tx)
    const m = byMerchant.get(merchant) ?? { total: 0, count: 0 }
    byMerchant.set(merchant, { total: m.total + tx.amount, count: m.count + 1 })
  }

  const days = range ? Math.ceil((range.endDate.getTime() - range.startDate.getTime()) / 86400000) + 1 : 30
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    avgDailySpend: totalExpense / days,
    categorySummary: [...byCategory.entries()]
      .map(([category, d]) => ({
        category,
        total: d.total,
        count: d.count,
        percentage: totalExpense > 0 ? (d.total / totalExpense) * 100 : 0,
        color: getCategoryColor(category),
      }))
      .sort((a, b) => b.total - a.total),
    topMerchants: [...byMerchant.entries()]
      .map(([merchant, d]) => ({ merchant, ...d }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    currency,
  }
}
