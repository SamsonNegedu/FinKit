import { describe, it, expect } from 'vitest'
import { RawTransaction } from '@/shared/types'
import { mergeWithoutDuplicates } from '@/shared/utils/dedupe'
import { assignStableIds } from '@/shared/utils/ids'
import { tx } from './testFixtures'

describe('dedupe + ids', () => {
  const raw = (description: string): RawTransaction => ({
    date: '2026-10-01',
    description,
    amount: -5,
    currency: 'EUR',
    rawData: {},
  })

  it('skips rows already present but keeps genuine repeats', () => {
    const existing = [raw('coffee'), raw('coffee')]
    const { added, skipped, merged } = mergeWithoutDuplicates(existing, [
      raw('coffee'),
      raw('coffee'),
      raw('coffee'),
      raw('lunch'),
    ])
    expect(skipped).toBe(2)
    expect(added).toBe(2)
    expect(merged).toHaveLength(4)
  })

  it('gives the same ids when the same data is processed again', () => {
    const rows = [raw('a'), raw('a'), raw('b')]
    const make = () => rows.map((r, i) => tx({ id: String(i), description: r.description }))
    const ids1 = assignStableIds(make(), rows).map(t => t.id)
    const ids2 = assignStableIds(make(), rows).map(t => t.id)
    expect(ids1).toEqual(ids2)
    expect(new Set(ids1).size).toBe(3)
  })
})
