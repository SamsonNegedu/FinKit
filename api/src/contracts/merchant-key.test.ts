import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { merchantName, normalizeMerchant, referencesOf } from './merchant-key'

// The same corpus is read by the web app's test, so both implementations of the merchant key keep agreeing
interface Row {
  recipient?: string
  description: string
}
interface Case {
  name: string
  same?: boolean
  rows: Row[]
}
const corpus: { cases: Case[] } = JSON.parse(
  readFileSync(new URL('../../../docs/merchant-key-cases.json', import.meta.url), 'utf8'),
)

describe('merchant key corpus', () => {
  it.each(corpus.cases)('$name', c => {
    const references = referencesOf(corpus.cases.flatMap(x => x.rows))
    const keys = c.rows.map(r => normalizeMerchant(merchantName(r, references)))

    expect(new Set(keys).size).toBe(c.same ? 1 : c.rows.length)
  })

  it('shares its reference logic with the web app, character for character', () => {
    const web = readFileSync(
      new URL('../../../web/src/shared/utils/categorizer/merchantReferences.ts', import.meta.url),
      'utf8',
    )
    const api = readFileSync(new URL('./merchant-references.ts', import.meta.url), 'utf8')

    expect(api).toBe(web)
  })
})
