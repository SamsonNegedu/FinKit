import { getNumberFormat } from './format'

// Transaction dates are plain calendar days ("2026-10-01"). `new Date("2026-10-01")` treats them
// as UTC midnight, which is the previous day in timezones behind UTC. Parse them as local days.
export function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
}

// Local calendar day as "YYYY-MM-DD" (toISOString() would shift it by the UTC offset)
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Day + short month in the same style as the number format (31 Oct / 31. Okt.)
export function formatDay(value: string | Date): string {
  const d = typeof value === 'string' ? parseLocalDate(value) : value

  return d.toLocaleDateString(getNumberFormat() === 'point' ? 'en-GB' : 'de-DE', { day: '2-digit', month: 'short' })
}
