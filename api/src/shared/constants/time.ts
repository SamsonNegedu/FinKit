export const MS_PER_SECOND = 1_000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

export const SECONDS_PER_MINUTE = 60
export const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE
export const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

export function addMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms)
}

export function diffDays(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / MS_PER_DAY
}

export function isoDaysFromNow(days: number, at = Date.now()): string {
  return new Date(at + days * MS_PER_DAY).toISOString()
}

export function isoDaysAgo(days: number, at = Date.now()): string {
  return new Date(at - days * MS_PER_DAY).toISOString()
}
