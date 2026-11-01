import { readFileSync } from 'node:fs'

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
  adminEmails: string[]
  allowedOrigin?: string
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
  if (provider === 'off') return { errors: [] }

  const isProd = env.NODE_ENV === 'production'

  if (provider === 'mock' && isProd && env.BANKING_ALLOW_MOCK_IN_PROD !== '1') {
    errors.push('The mock provider is not allowed in production')
  }

  let encryptionKey: Buffer
  if (env.BANKING_ENCRYPTION_KEY) {
    encryptionKey = Buffer.from(env.BANKING_ENCRYPTION_KEY, 'base64')
    if (encryptionKey.length !== 32) errors.push('BANKING_ENCRYPTION_KEY must be 32 bytes, base64 encoded')
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
  const adminEmails = (env.BANKING_ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  const redirectUrl = env.BANKING_REDIRECT_URL || '/api/banking/callback'
  if (provider === 'enablebanking') {
    if (!redirectUrl.startsWith('https://') && isProd) errors.push('BANKING_REDIRECT_URL must be an https URL')
  }

  let ebPrivateKey: string | undefined
  if (provider === 'enablebanking') {
    if (!env.EB_APP_ID) errors.push('EB_APP_ID is required')
    try {
      ebPrivateKey =
        env.EB_PRIVATE_KEY || (env.EB_PRIVATE_KEY_PATH ? readFileSync(env.EB_PRIVATE_KEY_PATH, 'utf8') : undefined)
    } catch {
      errors.push('Could not read EB_PRIVATE_KEY_PATH')
    }
    if (!ebPrivateKey) errors.push('EB_PRIVATE_KEY_PATH (or EB_PRIVATE_KEY) is required')
  }

  if (errors.length) return { errors }
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
      adminEmails,
      allowedOrigin: env.ALLOWED_ORIGIN,
      ebAppId: env.EB_APP_ID,
      ebPrivateKey,
    },
  }
}
