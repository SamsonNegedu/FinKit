import { describe, expect, it } from 'vitest'
import { countedDate } from './countsToMonth'

describe('countedDate', () => {
  it('is the bank date unless the payment counts toward another month', () => {
    expect(countedDate({ date: '2026-04-30' })).toBe('2026-04-30')
    expect(countedDate({ date: '2026-04-30', countsToMonth: '2026-04' })).toBe('2026-04-30')
    expect(countedDate({ date: '2026-04-30', countsToMonth: '2026-05' })).toBe('2026-05-01')
    expect(countedDate({ date: '2026-05-02', countsToMonth: '2026-04' })).toBe('2026-04-30')
  })
})
