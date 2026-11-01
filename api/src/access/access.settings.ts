export interface AccessSettings {
  isProd: boolean
  mode: 'cloudflare' | 'dev'
  teamDomain?: string
  audience?: string
  adminEmails: string[]
  allowedOrigin?: string
}

export const ACCESS_SETTINGS = Symbol('ACCESS_SETTINGS')
export const ACCESS_VERIFIER = Symbol('ACCESS_VERIFIER')
export type AccessVerifier = (token: string) => Promise<{ email: string }>

export interface Actor {
  email: string
  admin: boolean
}

/**
 * In production, requests must carry a Cloudflare Access token that the server verifies itself.
 * Locally there is no Access, so the developer is treated as the admin.
 */
export function loadAccessSettings(env: NodeJS.ProcessEnv = process.env): AccessSettings {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN
  const audience = env.CF_ACCESS_AUD
  return {
    isProd: env.NODE_ENV === 'production',
    mode: teamDomain && audience ? 'cloudflare' : 'dev',
    teamDomain,
    audience,
    adminEmails: (env.BANKING_ADMIN_EMAILS || env.ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
    allowedOrigin: env.ALLOWED_ORIGIN,
  }
}
