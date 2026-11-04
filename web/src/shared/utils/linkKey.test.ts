import { describe, expect, it } from 'vitest'
import type { RawTransaction, Transaction } from '@/shared/types'
import { assignStableIds, linkKey, rawKey } from './ids'

describe('linkKey', () => {
  it('matches the server copy of an expense the bank gave no id for', () => {
    const raw: RawTransaction = {
      date: '2026-08-01',
      description: 'Coffee',
      amount: -4.5,
      currency: 'EUR',
      recipient: 'Cafe',
      rawData: {},
    }
    // How processing turns a raw row into a workspace one: the sign moves into `type`, the text may be anonymized
    const processed = { ...raw, amount: 4.5, type: 'expense', description: 'x', recipient: 'Someone' } as Transaction
    const [tx] = assignStableIds([processed], [raw])

    expect(rawKey(tx)).not.toBe(rawKey(raw))
    expect(linkKey(tx)).toBe(rawKey(raw))
  })
})
