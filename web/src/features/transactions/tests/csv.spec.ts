import { describe, it, expect } from 'vitest'
import { transactionsToCsv } from '@/shared/utils/csv'
import { tx } from './testFixtures'

describe('csv', () => {
  it('quotes values and defuses formulas', () => {
    const csv = transactionsToCsv([tx({ id: '1', description: '=HYPERLINK("x")', merchant: 'A, B' })])
    expect(csv).toContain('"\'=HYPERLINK(""x"")"')
    expect(csv).toContain('"A, B"')
  })
})
