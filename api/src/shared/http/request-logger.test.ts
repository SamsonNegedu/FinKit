import { describe, it, expect } from 'vitest'
import { redact } from './request-logger.middleware'

describe('logging', () => {
  it('redacts the one-time code and state', () => {
    expect(redact('GET /api/banking/callback?code=abc123&state=xyz789 302 4ms')).toBe(
      'GET /api/banking/callback?code=[redacted]&state=[redacted] 302 4ms',
    )
  })
  it('leaves other URLs alone', () => {
    expect(redact('GET /api/learn/mappings 200 1ms')).toBe('GET /api/learn/mappings 200 1ms')
  })
})
