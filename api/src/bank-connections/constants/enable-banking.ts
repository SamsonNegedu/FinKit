import { SECONDS_PER_DAY, SECONDS_PER_HOUR } from '../../shared/constants/time'

/** Default PSU consent length when Enable Banking omits `maximum_consent_validity` (seconds). */
export const DEFAULT_CONSENT_VALIDITY_SECONDS = 90 * SECONDS_PER_DAY

export const DEFAULT_CONSENT_DAYS = DEFAULT_CONSENT_VALIDITY_SECONDS / SECONDS_PER_DAY

/** RS256 JWT lifetime for Enable Banking API calls. */
export const ENABLE_BANKING_JWT_TTL_SECONDS = SECONDS_PER_HOUR

/** Refresh cached JWT this many seconds before `exp`. */
export const ENABLE_BANKING_JWT_REFRESH_BUFFER_SECONDS = 60

/** Far above a normal pagination run; hitting this fails instead of truncating silently. */
export const ENABLE_BANKING_MAX_TRANSACTION_PAGES = 500

export const ENABLE_BANKING_REQUEST_TIMEOUT_MS = 30_000

/** Mock bank uses a longer fake consent for local testing. */
export const TEST_BANK_DEFAULT_CONSENT_DAYS = 179

export const TEST_BANK_MAX_MOCK_HISTORY_DAYS = 400

/** The test bank forgets anything older than this, so backfill has an end to find. */
export const TEST_BANK_HISTORY_LIMIT_DAYS = 800
