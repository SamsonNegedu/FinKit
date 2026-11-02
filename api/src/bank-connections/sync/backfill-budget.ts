import { MS_PER_HOUR } from '../../shared/constants/time'
import { BACKFILL_MIN_WINDOW_DAYS } from '../constants'

/**
 * How many requests a history backfill may still make for one account today. Banks cap the requests
 * made without the person present, so what the scheduled syncs still need today (one page per
 * remaining run) is held back, and backfill only gets what is left of the cap.
 */
export function backfillAllowance(p: { cap: number; used: number; now: Date; autoSyncHours: number }): number {
  const startOfDay = Date.UTC(p.now.getUTCFullYear(), p.now.getUTCMonth(), p.now.getUTCDate())
  const hoursLeft = 24 - (p.now.getTime() - startOfDay) / MS_PER_HOUR
  // With scheduled syncs off nothing is held back, but the cap still applies
  const runsLeft = p.autoSyncHours > 0 ? Math.floor(hoursLeft / p.autoSyncHours) : 0

  return Math.max(0, p.cap - runsLeft - p.used)
}

/** A window that did not fit the day's requests is retried smaller, down to a week. */
export function shrink(windowDays: number): number {
  return Math.max(BACKFILL_MIN_WINDOW_DAYS, Math.floor(windowDays / 2))
}

/** Thrown by us (not the bank) when today's request budget for an account is used up. */
export class BudgetExhausted extends Error {}
