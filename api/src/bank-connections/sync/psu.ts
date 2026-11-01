import { isIP } from 'node:net'
import type { Request } from 'express'
import type { PsuInfo } from '../providers/bank-provider'

/**
 * The person's own IP address and browser, for the bank. Behind Cloudflare Access the real address
 * is in Cf-Connecting-IP; anywhere else we use the connection's own. Anything odd is left out.
 */
export function psuFromRequest(req: Request, behindCloudflare: boolean): PsuInfo {
  const raw = (behindCloudflare ? req.header('cf-connecting-ip') : req.ip)?.trim().replace(/^::ffff:/, '')
  const ua = Array.from(req.header('user-agent') ?? '')
    .filter(ch => ch.charCodeAt(0) > 31 && ch.charCodeAt(0) !== 127)
    .join('')
    .trim()
    .slice(0, 512)

  return { ip: raw && isIP(raw) ? raw : undefined, userAgent: ua || undefined }
}
