import type { DateRange, Transaction } from '@/shared/types'
import { inPeriod } from '@/shared/utils/summary'
import { MS_PER_DAY } from '@/shared/constants/time'

/** The stretch of equal length just before this one, so a number can be put in context. Null for "all time". */
export function previousRange(range: DateRange | null): DateRange | null {
  if (!range) {
    return null
  }
  const days = Math.round((range.endDate.getTime() - range.startDate.getTime()) / MS_PER_DAY) + 1
  const endDate = new Date(range.startDate.getTime() - MS_PER_DAY)
  const startDate = new Date(endDate.getTime() - (days - 1) * MS_PER_DAY)

  return { startDate, endDate }
}

/**
 * The transactions of the period just before this one, or null when there is nothing to compare with: "all time"
 * has no earlier stretch, and a period that starts at the first transaction has an earlier stretch with no data,
 * which is not the same as a stretch where nothing was spent.
 */
export function earlierTransactions(all: Transaction[], range: DateRange | null): Transaction[] | null {
  const earlier = previousRange(range)

  if (!earlier) {
    return null
  }
  const rows = inPeriod(all, earlier)

  return rows.length > 0 ? rows : null
}
