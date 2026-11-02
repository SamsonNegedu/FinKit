import type { DateRange } from '@/shared/types'
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
