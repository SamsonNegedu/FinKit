import { formatDay } from '@/shared/utils/dates'

/** "12 Sep – 19 Sep", "from 12 Sep", or a nudge when no dates are set yet. */
export function tripDates(t: { startDate: string | null; endDate: string | null }): string {
  if (t.startDate && t.endDate) {
    return `${formatDay(t.startDate)} – ${formatDay(t.endDate)}`
  }
  if (t.startDate) {
    return `from ${formatDay(t.startDate)}`
  }

  return 'No travel dates yet'
}
