import { describe, expect, it } from 'vitest'
import { prefillFromPayments } from '../utils/paymentsPrefill'

const p = (date: string, amount: number, name = 'Stadtwerke') => ({ date, amount, name })

describe('prefilling a contract from picked payments', () => {
  it('takes the common name, the typical amount and the monthly rhythm', () => {
    expect(prefillFromPayments([p('2026-01-03', 80), p('2026-02-04', 80), p('2026-03-03', 80, 'SW 123')])).toEqual({
      name: 'Stadtwerke',
      amount: 80,
      frequency: 'monthly',
      kind: 'fixed',
    })
  })

  it('calls a drifting bill variable and uses its median', () => {
    const got = prefillFromPayments([p('2026-01-03', 60), p('2026-02-03', 95), p('2026-03-03', 70)])

    expect(got).toMatchObject({ amount: 70, kind: 'variable' })
  })

  it('reads quarterly and yearly gaps, and defaults one payment to monthly', () => {
    expect(prefillFromPayments([p('2026-01-01', 10), p('2026-04-01', 10)]).frequency).toBe('quarterly')
    expect(prefillFromPayments([p('2025-01-01', 10), p('2026-01-01', 10)]).frequency).toBe('yearly')
    expect(prefillFromPayments([p('2026-01-01', 10)]).frequency).toBe('monthly')
  })
})
