import { createRemoteJWKSet, jwtVerify } from 'jose'
import { AccessVerifier } from './access.settings'

/** Verifies the token Cloudflare Access attaches to every request it lets through. */
export function cloudflareVerifier(teamDomain: string, audience: string): AccessVerifier {
  const issuer = `https://${teamDomain}.cloudflareaccess.com`
  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))
  return async token => {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience })
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
    if (!email) throw new Error('Token has no email')
    return { email }
  }
}
