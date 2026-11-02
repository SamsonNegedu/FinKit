import { readFileSync } from 'node:fs'
import { BACKFILL_PAGE_PAUSE_MS, DEFAULT_BACKGROUND_REQUEST_CAP } from '../constants'

export type ProviderMode = 'off' | 'mock' | 'enablebanking'

export interface BankingConfig {
  provider: ProviderMode
  isProd: boolean
  encryptionKey: Buffer
  usesDevKey: boolean
  redirectUrl: string
  // Access control
  accessMode: 'cloudflare' | 'dev'
  cfTeamDomain?: string
  cfAudience?: string
  allowedOrigin?: string
  /** Hours between scheduled catch-up syncs; 0 turns them off */
  autoSyncHours: number
  /** Background requests per account per day we allow ourselves (banks enforce their own cap; 4 is typical) */
  backgroundRequestCap: number
  /** Milliseconds between pages of a history backfill fetch (0 in tests) */
  backfillPauseMs: number
  // Enable Banking
  ebAppId?: string
  ebPrivateKey?: string
}

interface ConfigResult {
  config?: BankingConfig
  errors: string[] // why banking is unavailable (logged, never shown to clients)
}

// A fixed key for local development only. Never accepted in production.
const DEV_KEY = Buffer.alloc(32, 7)

/**
 * Banking fails closed: in production it refuses to run unless access control, a real
 * encryption key and (for the real provider) credentials are all configured.
 */
export function loadBankingConfig(env: NodeJS.ProcessEnv = process.env): ConfigResult {
  const errors: string[] = []
  const provider = (env.BANKING_PROVIDER || 'off') as ProviderMode

  if (!['off', 'mock', 'enablebanking'].includes(provider)) {
    return {
      errors: [`BANKING_PROVIDER must be off, mock or enablebanking (got "${provider}")`],
    }
  }
  if (provider === 'off') {
    return { errors: [] }
  }

  const isProd = env.NODE_ENV === 'production'

  if (provider === 'mock' && isProd && env.BANKING_ALLOW_MOCK_IN_PROD !== '1') {
    errors.push('The mock provider is not allowed in production')
  }

  let encryptionKey: Buffer

  if (env.BANKING_ENCRYPTION_KEY) {
    encryptionKey = Buffer.from(env.BANKING_ENCRYPTION_KEY, 'base64')
    if (encryptionKey.length !== 32) {
      errors.push('BANKING_ENCRYPTION_KEY must be 32 bytes, base64 encoded')
    }
  } else if (!isProd) {
    encryptionKey = DEV_KEY
  } else {
    encryptionKey = DEV_KEY
    errors.push('BANKING_ENCRYPTION_KEY is required in production')
  }

  const cfTeamDomain = env.CF_ACCESS_TEAM_DOMAIN
  const cfAudience = env.CF_ACCESS_AUD
  const accessMode: 'cloudflare' | 'dev' = cfTeamDomain && cfAudience ? 'cloudflare' : 'dev'

  if (isProd && accessMode !== 'cloudflare') {
    errors.push('CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are required in production')
  }
  const redirectUrl = env.BANKING_REDIRECT_URL || '/api/banking/callback'

  if (provider === 'enablebanking') {
    if (!redirectUrl.startsWith('https://') && isProd) {
      errors.push('BANKING_REDIRECT_URL must be an https URL')
    }
  }

  let ebPrivateKey: string | undefined

  if (provider === 'enablebanking') {
    if (!env.EB_APP_ID) {
      errors.push('EB_APP_ID is required')
    }
    try {
      ebPrivateKey =
        env.EB_PRIVATE_KEY || (env.EB_PRIVATE_KEY_PATH ? readFileSync(env.EB_PRIVATE_KEY_PATH, 'utf8') : undefined)
    } catch {
      errors.push('Could not read EB_PRIVATE_KEY_PATH')
    }
    if (!ebPrivateKey) {
      errors.push('EB_PRIVATE_KEY_PATH (or EB_PRIVATE_KEY) is required')
    }
  }

  if (errors.length) {
    return { errors }
  }

  return {
    errors,
    config: {
      provider,
      isProd,
      encryptionKey,
      usesDevKey: !env.BANKING_ENCRYPTION_KEY,
      redirectUrl,
      accessMode,
      cfTeamDomain,
      cfAudience,
      allowedOrigin: env.ALLOWED_ORIGIN,
      autoSyncHours: parseHours(env.BANKING_AUTO_SYNC_HOURS),
      backgroundRequestCap: parseCap(env.BANKING_BACKGROUND_REQUEST_CAP),
      backfillPauseMs: parsePause(env.BANKING_BACKFILL_PAUSE_MS),
      ebAppId: env.EB_APP_ID,
      ebPrivateKey,
    },
  }
}

/** Default 12 (twice a day, well inside the banks' limit for access without the user present). 0 = off. */
function parseHours(value?: string): number {
  const n = value === undefined || value === '' ? 12 : Number(value)

  return Number.isFinite(n) && n >= 0 ? (n === 0 ? 0 : Math.max(6, n)) : 12
}

/** Lower it if a bank allows less; a bad value falls back to the default rather than risking the bank's limit. */
function parseCap(value?: string): number {
  const n = value === undefined || value === '' ? DEFAULT_BACKGROUND_REQUEST_CAP : Number(value)

  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : DEFAULT_BACKGROUND_REQUEST_CAP
}

function parsePause(value?: string): number {
  const n = value === undefined || value === '' ? BACKFILL_PAGE_PAUSE_MS : Number(value)

  return Number.isFinite(n) && n >= 0 ? n : BACKFILL_PAGE_PAUSE_MS
}
