import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import type { Contract } from '../api/contracts.api'
import { uploadCandidates } from '../utils/uploadCandidates'

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: Math.random().toString(),
    date: '2026-01-05',
    description: 'Lastschrift Gym',
    amount: -25,
    currency: 'EUR',
    type: 'expense',
    recipient: 'Gym GmbH',
    category: 'Subscriptions',
    isRecurring: true,
    recurringFrequency: 'monthly',
    rawData: {},
    ...over,
  }) as Transaction

const months = (n: number, over: Partial<Transaction> = {}) =>
  Array.from({ length: n }, (_, i) => tx({ date: `2026-0${i + 1}-05`, ...over }))

describe('uploadCandidates', () => {
  it('offers recurring payments from uploaded files once they have repeated enough', () => {
    expect(uploadCandidates(months(2), [])).toEqual([])
    expect(uploadCandidates(months(3), [])[0]).toMatchObject({
      name: 'Gym GmbH',
      amount: 25,
      frequency: 'monthly',
      lastDate: '2026-03-05',
      category: 'Subscriptions',
      count: 3,
    })
    expect(
      uploadCandidates([tx({ recurringFrequency: 'yearly' }), tx({ recurringFrequency: 'yearly' })], []),
    ).toHaveLength(1)
  })

  it('leaves out synced rows, income, transfers and what the server already has', () => {
    const known = { payee: 'Gym GmbH', name: 'Gym' } as Contract

    expect(uploadCandidates(months(3, { bankName: 'N26' }), [])).toEqual([])
    expect(uploadCandidates(months(3, { type: 'income' }), [])).toEqual([])
    expect(uploadCandidates(months(3, { category: 'Transfer' }), [])).toEqual([])
    expect(uploadCandidates(months(3), [known])).toEqual([])
  })

  it('falls back to Other for a category you do not have', () => {
    expect(uploadCandidates(months(3, { category: 'Nonsense' }), [])[0].category).toBe('Other')
  })
})
