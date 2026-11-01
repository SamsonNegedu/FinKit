import { describe, it, expect } from 'vitest'
import { decrypt, encrypt } from './encryption'

const KEY = Buffer.alloc(32, 9)

describe('crypto', () => {
  it('round-trips and uses a fresh IV each time', () => {
    const a = encrypt('secret', KEY),
      b = encrypt('secret', KEY)

    expect(decrypt(a, KEY)).toBe('secret')
    expect(a).not.toBe(b)
  })
  it('rejects tampered or wrongly keyed data', () => {
    const blob = encrypt('secret', KEY)
    const parts = blob.split('.')

    parts[3] = Buffer.from('tampered').toString('base64')
    expect(() => decrypt(parts.join('.'), KEY)).toThrow(/authenticate/i)
    expect(() => decrypt(blob, Buffer.alloc(32, 1))).toThrow(/authenticate/i)
  })
})
