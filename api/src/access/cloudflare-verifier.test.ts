import { describe, expect, it } from 'vitest'
import { issuerFor } from './cloudflare-verifier'

describe('issuerFor', () => {
  it.each(['yourteam', 'yourteam.cloudflareaccess.com', 'https://yourteam.cloudflareaccess.com/', ' yourteam '])(
    'builds one issuer from %s',
    value => {
      expect(issuerFor(value)).toBe('https://yourteam.cloudflareaccess.com')
    },
  )
})
