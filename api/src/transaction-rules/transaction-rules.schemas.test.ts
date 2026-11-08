import { describe, expect, it } from 'vitest'
import { CreateRuleSchema } from './transaction-rules.schemas'

const parse = (match: unknown) => CreateRuleSchema.safeParse({ match, category: 'Savings' })

describe('rule account condition', () => {
  it('is enough on its own, and is stored without spaces or lower case', () => {
    const r = parse({ iban: ' de89 3704 0044 0532 0130 00 ' })

    expect(r.success && r.data.match.iban).toBe('DE89370400440532013000')
  })

  it('rejects something that is not an account number', () => {
    expect(parse({ iban: 'not an iban!' }).success).toBe(false)
    expect(parse({ iban: 'DE89' }).success).toBe(false)
  })
})
