import { describe, it, expect } from 'vitest'
import { RawTransaction } from '@/shared/types'
import { mergeWithoutDuplicates } from '@/shared/utils/dedupe'
import { rawKey } from '@/shared/utils/ids'

describe('bank transactions', () => {
  const bankRow = (externalId: string, description: string): RawTransaction =>
    ({ date: '2026-10-01', description, amount: -5, currency: 'EUR', externalId, rawData: {} }) as RawTransaction

  it("identifies a row by the bank's own id, even if its text changes", () => {
    const { added, skipped } = mergeWithoutDuplicates(
      [bankRow('acc:1', 'Coffee')],
      [bankRow('acc:1', 'COFFEE SHOP 0042')],
    )
    expect([added, skipped]).toEqual([0, 1])
  })
  it('keeps rows with different bank ids even when everything else matches', () => {
    const { added } = mergeWithoutDuplicates([bankRow('acc:1', 'Coffee')], [bankRow('acc:2', 'Coffee')])
    expect(added).toBe(1)
  })
  it('does not confuse a bank id with content-based identity', () => {
    expect(rawKey(bankRow('x', 'a'))).toBe('ext:x')
    expect(rawKey({ ...bankRow('x', 'a'), externalId: undefined })).not.toContain('ext:')
  })
})
