import type { Transaction } from '@/shared/types'
import type { MonthGroup } from './sheetYear'

export interface IncomeGap {
  /** The month with no income, "2026-08" */
  key: string
  label: string
  /** A payment from the next or the previous month that looks like it belongs here, when there is one */
  suggestion?: { tx: Transaction; from: string }
}

/** Within this many days of the month's edge, a payment may have been taken early or late */
const EDGE_DAYS = 10
const SIMILAR = 0.15

const isIncome = (t: Transaction) => t.type === 'income' && !t.isExcluded && t.category !== 'Transfer'

/** The month before or after a "YYYY-MM" key */
const near = (key: string, by: number) => {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Of a month's income, the payments that have a twin of about the same size: a salary, not a one-off. */
const repeating = (rows: Transaction[]) =>
  rows.filter(t => rows.some(o => o !== t && Math.abs(o.amount - t.amount) <= t.amount * SIMILAR))

/**
 * Months between the first and last month that had income, where no income counted. When the next or the previous
 * month holds two payments of the same size, one of them taken near the edge probably belongs here: it is offered as
 * a suggestion, never moved. Months a person already placed a payment in by hand are left out of the suggestions.
 */
export function incomeGaps(months: MonthGroup[]): IncomeGap[] {
  const income = new Map(months.map(m => [m.key, m.txs.filter(isIncome)]))
  const withIncome = months.filter(m => (income.get(m.key) ?? []).length > 0).map(m => m.key)

  if (withIncome.length < 2) {
    return []
  }
  const first = withIncome[0]
  const last = withIncome[withIncome.length - 1]

  return months
    .filter(m => m.key > first && m.key < last && (income.get(m.key) ?? []).length === 0)
    .map(m => {
      const next = repeating(income.get(near(m.key, 1)) ?? [])
        .filter(t => t.countsToMonthSource !== 'manual' && Number(t.date.slice(8)) <= EDGE_DAYS)
        .sort((a, b) => a.date.localeCompare(b.date))[0]
      const previous = repeating(income.get(near(m.key, -1)) ?? [])
        .filter(t => t.countsToMonthSource !== 'manual' && Number(t.date.slice(8)) >= 31 - EDGE_DAYS)
        .sort((a, b) => b.date.localeCompare(a.date))[0]
      const tx = next ?? previous

      return { key: m.key, label: m.label, suggestion: tx ? { tx, from: tx.date.slice(0, 7) } : undefined }
    })
}
