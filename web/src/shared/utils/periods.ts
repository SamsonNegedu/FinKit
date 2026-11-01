import { DateRange, Transaction } from '@/shared/types'
import { parseLocalDate } from './dates'

// Set a date to the end of that day (23:59:59.999) so every transaction on it is included
export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
export const monthRange = (year: number, month: number): DateRange => ({
  startDate: new Date(year, month, 1),
  endDate: endOfDay(new Date(year, month + 1, 0)),
})
export const yearRange = (year: number): DateRange => ({
  startDate: new Date(year, 0, 1),
  endDate: endOfDay(new Date(year, 11, 31)),
})
export const sameRange = (a: DateRange | null, b: DateRange) =>
  !!a && a.startDate.getTime() === b.startDate.getTime() && a.endDate.getTime() === b.endDate.getTime()

/** Years that have data, newest first, each with the months (0-11) that have data, newest first. */
export function yearsWithData(transactions: Transaction[]): Array<{ year: number; months: number[] }> {
  const byYear = new Map<number, Set<number>>()
  for (const tx of transactions) {
    const d = parseLocalDate(tx.date)
    const months = byYear.get(d.getFullYear()) ?? new Set<number>()
    months.add(d.getMonth())
    byYear.set(d.getFullYear(), months)
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months: [...months].sort((a, b) => b - a),
    }))
}
