import { describe, expect, it } from 'vitest'
import { matchesAmountQuery } from './amountQuery'

describe('matchesAmountQuery', () => {
  it('matches a decimal query exactly', () => {
    expect(matchesAmountQuery(12.5, '12.50')).toBe(true)
    expect(matchesAmountQuery(12.5, '12,5')).toBe(true)
    expect(matchesAmountQuery(12.51, '12.50')).toBe(false)
  })

  it('matches a whole-number query across the whole euro', () => {
    expect(matchesAmountQuery(12.99, '12')).toBe(true)
    expect(matchesAmountQuery(120, '12')).toBe(false)
    expect(matchesAmountQuery(13, '12')).toBe(false)
  })

  it('ignores a sign and a currency symbol', () => {
    expect(matchesAmountQuery(12.5, '-12.50')).toBe(true)
    expect(matchesAmountQuery(12.5, '€12.50')).toBe(true)
  })

  it('does not treat text as an amount', () => {
    expect(matchesAmountQuery(7, '7-Eleven')).toBe(false)
    expect(matchesAmountQuery(7, '')).toBe(false)
  })
})
