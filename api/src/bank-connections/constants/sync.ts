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

/** Background (nobody present) requests a bank allows per account per day; we assume the common PSD2 figure of 4. */
export const DEFAULT_BACKGROUND_REQUEST_CAP = 4

/** Backfill walks back in windows this size; it halves after a window that did not fit the day's budget. */
export const BACKFILL_WINDOW_DAYS = 90
export const BACKFILL_MIN_WINDOW_DAYS = 7

/** Never look further back than this, whatever the bank says. */
export const BACKFILL_FLOOR = '2015-01-01'

/** Two empty windows in a row means the history has ended (one can be a genuinely quiet stretch). */
export const BACKFILL_EMPTY_LIMIT = 2

/** Pause between pages of one fetch, so a window never arrives as a burst. */
export const BACKFILL_PAGE_PAUSE_MS = 3_000

/** Per-account request counts are only needed for today; keep a few days for debugging. */
export const REQUEST_BUDGET_RETENTION_DAYS = 7

/** When a bank answers "too many requests" without saying when to return: Enable Banking's own advice is six hours. */
export const RATE_LIMIT_BACKOFF_SECONDS = 6 * 3600
