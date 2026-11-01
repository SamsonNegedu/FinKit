import { MS_PER_HOUR, MS_PER_MINUTE } from '../../shared/constants/time'

export const MIN_SYNC_INTERVAL_MS = MS_PER_MINUTE
export const MAX_SYNC_RANGE_DAYS = 366
/** Re-fetch a few days already seen; repeats are skipped by the bank's own ids. */
export const SYNC_OVERLAP_DAYS = 3
export const DEFAULT_SYNC_HISTORY_DAYS = 90

/** Poll interval for scheduled catch-up sync (independent of `BANKING_AUTO_SYNC_HOURS`). */
export const AUTO_SYNC_CHECK_INTERVAL_MS = 30 * MS_PER_MINUTE

/** After the app starts, catch up once soon: it may have been stopped for days (scheduled hosting). */
export const AUTO_SYNC_STARTUP_DELAY_MS = MS_PER_MINUTE

export const AUTO_SYNC_LOOKBACK_MS = (hours: number) => hours * MS_PER_HOUR
