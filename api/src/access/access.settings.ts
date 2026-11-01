export interface AccessSettings {
  isProd: boolean
  mode: 'cloudflare' | 'dev'
  teamDomain?: string
  audience?: string
  /** Everyone who may use this FinKit. They are all equal, and each sees only their own data. */
  allowedEmails: string[]
  /** Who inherits data from before user accounts existed: the first address listed, never first to arrive. */
  legacyOwner?: string
  allowedOrigin?: string
}

export const ACCESS_SETTINGS = Symbol('ACCESS_SETTINGS')
export const ACCESS_VERIFIER = Symbol('ACCESS_VERIFIER')
export type AccessVerifier = (token: string) => Promise<{ email: string }>

export interface Actor {
  email: string
  /** Whose data this request may touch. Every stored row carries it. */
  userId: string
}

/**
 * In production, requests must carry a Cloudflare Access token that the server verifies itself, and
 * the email in it must be on the allowed list. Locally there is no Access: the developer is
 * dev@localhost, and X-Dev-User lets you try other people. In production, missing Access settings
 * stop the server from starting.
 */
export function loadAccessSettings(env: NodeJS.ProcessEnv = process.env): AccessSettings {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN
  const audience = env.CF_ACCESS_AUD
  const isProd = env.NODE_ENV === 'production'

  // Fail closed: in production a missing Cloudflare setup must never fall back to the shared dev identity
  if (isProd && (!teamDomain || !audience)) {
    throw new Error('CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are required in production')
  }
  // Same for the web app's address: without it Origin can't be enforced and CORS would be open to everyone
  if (isProd && !env.ALLOWED_ORIGIN) {
    throw new Error('ALLOWED_ORIGIN is required in production (the web app origin, e.g. https://finkit.example.com)')
  }
  const mode = teamDomain && audience ? 'cloudflare' : 'dev'
  // BANKING_ADMIN_EMAILS and ADMIN_EMAILS are the old names for this list
  const listed = (env.ALLOWED_USER_EMAILS || env.BANKING_ADMIN_EMAILS || env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const allowedEmails = mode === 'dev' ? [...new Set(['dev@localhost', ...listed])] : listed

  return {
    isProd,
    mode,
    teamDomain,
    audience,
    allowedEmails,
    // With nobody listed (and not in development) nobody gets in
    legacyOwner: mode === 'dev' ? 'dev@localhost' : listed[0],
    allowedOrigin: env.ALLOWED_ORIGIN,
  }
}
