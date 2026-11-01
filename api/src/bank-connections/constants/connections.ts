import { MS_PER_HOUR, MS_PER_MINUTE } from '../../shared/constants/time'

/** Days before `valid_until` when we show “expiring soon”. */
export const CONNECTION_EXPIRING_SOON_DAYS = 14

/** Bank list cache for connect flow. */
export const BANK_LIST_CACHE_TTL_MS = MS_PER_HOUR

/** Per-email connect attempts. */
export const CONNECT_RATE_LIMIT_WINDOW_MS = 10 * MS_PER_MINUTE
export const CONNECT_RATE_LIMIT_MAX_ATTEMPTS = 10

/** OAuth `state` cookie and DB row lifetime. */
export const OAUTH_STATE_TTL_MS = 10 * MS_PER_MINUTE

export const SYNC_LOG_RETENTION_DAYS = 90
export const AUDIT_LOG_RETENTION_DAYS = 365
