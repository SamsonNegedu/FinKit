import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { merchantKeyOf, normalizeMerchant, referenceTokens, setReferenceTokens } from './index'

// The same corpus is read by the API's test, so both implementations of the merchant key keep agreeing
interface Row {
  recipient?: string
  merchant?: string
  description: string
}
interface Case {
  name: string
  same?: boolean
  distinct?: boolean
  rows: Row[]
}
const corpus: { cases: Case[] } = JSON.parse(
  readFileSync(new URL('../../../../../docs/merchant-key-cases.json', import.meta.url), 'utf8'),
)

afterEach(() => setReferenceTokens(new Set()))

describe('merchant key corpus', () => {
  it.each(corpus.cases)('$name', c => {
    setReferenceTokens(
      referenceTokens(corpus.cases.flatMap(x => x.rows).map(r => `${r.recipient ?? ''} ${r.description}`)),
    )
    const keys = c.rows.map(r => normalizeMerchant(merchantKeyOf(r)))

    expect(new Set(keys).size).toBe(c.same ? 1 : c.rows.length)
  })
})
