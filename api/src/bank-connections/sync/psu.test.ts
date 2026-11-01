import { describe, expect, it } from 'vitest'
import type { Request } from 'express'
import { psuFromRequest } from './psu'

const req = (headers: Record<string, string>, ip?: string) =>
  ({ header: (n: string) => headers[n.toLowerCase()], ip }) as unknown as Request

describe('psuFromRequest', () => {
  it('uses the Cloudflare address behind Cloudflare, the connection address otherwise', () => {
    const r = req({ 'cf-connecting-ip': '203.0.113.7', 'user-agent': 'UA' }, '10.0.0.2')

    expect(psuFromRequest(r, true)).toEqual({ ip: '203.0.113.7', userAgent: 'UA' })
    expect(psuFromRequest(r, false).ip).toBe('10.0.0.2')
  })
  it('drops addresses that are not addresses, and cleans the browser string', () => {
    expect(psuFromRequest(req({ 'cf-connecting-ip': 'not-an-ip; DROP' }), true).ip).toBeUndefined()
    expect(psuFromRequest(req({ 'user-agent': 'Moz\r\nX: y' }), true).userAgent).toBe('MozX: y')
    expect(psuFromRequest(req({}, '::ffff:198.51.100.4'), false).ip).toBe('198.51.100.4')
    expect(psuFromRequest(req({ 'user-agent': 'a'.repeat(900) }), true).userAgent).toHaveLength(512)
  })
})
