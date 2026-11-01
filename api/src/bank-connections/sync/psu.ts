import { isIP } from 'node:net'
import type { Request } from 'express'
import type { PsuInfo } from '../providers/bank-provider'

/**
 * The person's own IP address and browser, for the bank. Behind Cloudflare Access the real address
 * is in Cf-Connecting-IP; anywhere else we use the connection's own. Anything odd is left out.
 */
export function psuFromRequest(req: Request, behindCloudflare: boolean): PsuInfo {
  const raw = (behindCloudflare ? req.header('cf-connecting-ip') : req.ip)?.trim().replace(/^::ffff:/, '')
  // oxlint-disable-next-line no-control-regex
  const ua = req
    .header('user-agent')
    ?.replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 512)

  return { ip: raw && isIP(raw) ? raw : undefined, userAgent: ua || undefined }
}
