import { describe, expect, it } from 'vitest'
import { syncFailureErrorBody, syncFailureHttpStatus } from './sync-failure-http'

describe('syncFailureHttpStatus', () => {
  it('maps provider kinds to HTTP status', () => {
    expect(syncFailureHttpStatus('consent_expired')).toBe(409)
    expect(syncFailureHttpStatus('rate_limited')).toBe(429)
    expect(syncFailureHttpStatus('too_large')).toBe(422)
    expect(syncFailureHttpStatus('unavailable')).toBe(502)
  })
})

describe('syncFailureErrorBody', () => {
  it('uses expired for consent_expired', () => {
    expect(syncFailureErrorBody('consent_expired')).toEqual({ error: 'expired' })
    expect(syncFailureErrorBody('rate_limited')).toEqual({ error: 'rate_limited' })
  })
})
