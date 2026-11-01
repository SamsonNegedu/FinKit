import { describe, it, expect } from 'vitest'
import { loadAccessSettings } from '../../access/access.settings'
import { loadBankingConfig } from './banking.config'

const KEY = Buffer.alloc(32, 9)

describe('config fails closed', () => {
  const prod = { NODE_ENV: 'production', ALLOWED_ORIGIN: 'https://finkit.test' }

  it('is off by default', () => expect(loadBankingConfig({}).config).toBeUndefined())
  it('rejects the mock bank in production', () => {
    expect(
      loadBankingConfig({
        ...prod,
        BANKING_PROVIDER: 'mock',
        CF_ACCESS_TEAM_DOMAIN: 't',
        CF_ACCESS_AUD: 'a',
        BANKING_ENCRYPTION_KEY: KEY.toString('base64'),
      }).errors.join(),
    ).toMatch(/mock/i)
  })
  it('requires a real encryption key in production', () => {
    expect(
      loadBankingConfig({
        ...prod,
        BANKING_PROVIDER: 'enablebanking',
        EB_APP_ID: 'x',
        EB_PRIVATE_KEY: 'k',
        BANKING_REDIRECT_URL: 'https://a.b/cb',
      }).errors.join(),
    ).toMatch(/ENCRYPTION_KEY/)
  })
  it('requires https for the return address in production', () => {
    expect(
      loadBankingConfig({
        ...prod,
        BANKING_PROVIDER: 'enablebanking',
        EB_APP_ID: 'x',
        EB_PRIVATE_KEY: 'k',
        BANKING_REDIRECT_URL: 'http://a.b/cb',
        CF_ACCESS_TEAM_DOMAIN: 't',
        CF_ACCESS_AUD: 'a',
        BANKING_ENCRYPTION_KEY: KEY.toString('base64'),
      }).errors.join(),
    ).toMatch(/https/)
  })
  it('accepts a complete production setup', () => {
    const r = loadBankingConfig({
      ...prod,
      BANKING_PROVIDER: 'enablebanking',
      EB_APP_ID: 'app',
      EB_PRIVATE_KEY: 'k',
      BANKING_REDIRECT_URL: 'https://a.b/cb',
      CF_ACCESS_TEAM_DOMAIN: 't',
      CF_ACCESS_AUD: 'a',
      BANKING_ENCRYPTION_KEY: KEY.toString('base64'),
      BANKING_ADMIN_EMAILS: 'Me@X.com',
    })

    expect(r.errors).toEqual([])
    const access = loadAccessSettings({
      ...prod,
      CF_ACCESS_TEAM_DOMAIN: 't',
      CF_ACCESS_AUD: 'a',
      BANKING_ADMIN_EMAILS: 'Me@X.com',
    })

    expect(access.mode).toBe('cloudflare')
    // BANKING_ADMIN_EMAILS is the old name for the allowed list
    expect(access.allowedEmails).toEqual(['me@x.com'])
  })
})

describe('sign-in settings', () => {
  it('is development mode (you are dev@localhost) without Cloudflare values', () => {
    expect(loadAccessSettings({}).mode).toBe('dev')
  })
  it('lets the first listed address inherit old data, however people arrive', () => {
    const a = loadAccessSettings({
      CF_ACCESS_TEAM_DOMAIN: 't',
      CF_ACCESS_AUD: 'a',
      ALLOWED_USER_EMAILS: 'B@x.com, c@x.com',
    })

    expect(a.allowedEmails).toEqual(['b@x.com', 'c@x.com'])
    expect(a.legacyOwner).toBe('b@x.com')
  })
})
