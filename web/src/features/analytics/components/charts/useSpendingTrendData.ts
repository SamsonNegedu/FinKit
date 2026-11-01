import { useMemo } from 'react'
import { Transaction, DateRange } from '@/shared/types'
import { toISODate, formatDay } from '@/shared/utils/dates'

export function useSpendingTrendData(transactions: Transaction[], dateRange: DateRange | null) {
  const dailyData = useMemo(() => {
    const byDate = new Map<string, { expenses: number; income: number }>()

    for (const tx of transactions) {
      if (tx.isExcluded || tx.category === 'Transfer') continue

      const date = tx.date
      const existing = byDate.get(date) || { expenses: 0, income: 0 }

      if (tx.type === 'expense') {
        existing.expenses += tx.amount
      } else {
        existing.income += tx.amount
      }

      byDate.set(date, existing)
    }

    if (dateRange) {
      const start = new Date(dateRange.startDate)
      const days = Math.floor((new Date(dateRange.endDate).getTime() - start.getTime()) / 86400000)
      for (let i = 0; i <= days; i++) {
        const dateStr = toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, { expenses: 0, income: 0 })
        }
      }
    }

    return Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        displayDate: formatDay(date),
        expenses: data.expenses,
        income: data.income,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions, dateRange])

  const cumulativeData = useMemo(
    () =>
      dailyData.reduce<Array<(typeof dailyData)[number] & { cumulative: number; cumulativeIncome: number }>>(
        (rows, d) => {
          const prev = rows[rows.length - 1]
          rows.push({
            ...d,
            cumulative: (prev?.cumulative ?? 0) + d.expenses,
            cumulativeIncome: (prev?.cumulativeIncome ?? 0) + d.income,
          })
          return rows
        },
        [],
      ),
    [dailyData],
  )

  return { dailyData, cumulativeData }
}
