import { createRemoteJWKSet, jwtVerify } from 'jose'
import { AccessVerifier } from './access.settings'

/**
 * .env.example shows CF_ACCESS_TEAM_DOMAIN as the full host (yourteam.cloudflareaccess.com), but the
 * issuer needs just one copy of the suffix. Accept both forms so a pasted full host doesn't make
 * every token fail with a 401.
 */
export function issuerFor(teamDomain: string): string {
  const team = teamDomain
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.cloudflareaccess\.com$/, '')

  return `https://${team}.cloudflareaccess.com`
}

/** Verifies the token Cloudflare Access attaches to every request it lets through. */
export function cloudflareVerifier(teamDomain: string, audience: string): AccessVerifier {
  const issuer = issuerFor(teamDomain)
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))

  return async token => {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience })
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''

    if (!email) {
      throw new Error('Token has no email')
    }

    return { email }
  }
}
