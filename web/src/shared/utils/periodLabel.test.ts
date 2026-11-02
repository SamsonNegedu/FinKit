import { describe, expect, it } from 'vitest'
import { monthRange, periodLabel, yearRange } from './periods'

describe('periodLabel', () => {
  it('names a year, a month, a custom range, and all time', () => {
    expect(periodLabel(yearRange(2025))).toBe('2025')
    expect(periodLabel(monthRange(2025, 9))).toBe('October 2025')
    expect(periodLabel({ startDate: new Date(2025, 8, 4), endDate: new Date(2026, 10, 30) })).toMatch(/2025 – .*2026/)
    expect(periodLabel(null)).toBe('All time')
  })
})
