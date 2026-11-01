import { describe, it, expect } from 'vitest'
import { RawTransaction } from '@/shared/types'
import { parseLocalDate, toISODate } from '@/shared/utils/dates'
import { loadRateStore } from '@/shared/utils/rates'
import { migrateOldIds, hashKey, rawKey } from '@/shared/utils/ids'
import { tx } from './testFixtures'

describe('local dates', () => {
  it('parses a plain day as that day in any timezone', () => {
    const d = parseLocalDate('2026-10-01')

    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 1])
    expect(toISODate(d)).toBe('2026-10-01')
  })
})

describe('exchange rate store', () => {
  it('ignores the old flat format and keeps rates per base currency', () => {
    const data: Record<string, string> = {}

    ;(globalThis as any).localStorage = {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => {
        data[k] = v
      },
    }
    data['finkit.rates'] = JSON.stringify({ USD: 0.9 })
    expect(loadRateStore()).toEqual({})
    data['finkit.rates'] = JSON.stringify({ EUR: { USD: 0.9 }, USD: { EUR: 1.1 } })
    expect(loadRateStore().EUR.USD).toBe(0.9)
    delete (globalThis as any).localStorage
  })
})

describe('old session id migration', () => {
  it('maps time-based ids to content ids by row index', () => {
    const raw = [
      { date: '2026-10-01', description: 'a', amount: -5, currency: 'EUR', rawData: {} },
      { date: '2026-10-02', description: 'b', amount: -6, currency: 'EUR', rawData: {} },
    ] as RawTransaction[]
    const old = [
      tx({ id: 'tx_1761990000000_0' }),
      tx({ id: 'tx_1761990000000_1', doubleBookingMatch: 'tx_1761990000000_0' }),
    ]
    const migrated = migrateOldIds(old, raw)

    expect(migrated[0].id).toBe(`tx_${hashKey(rawKey(raw[0]))}_1`)
    expect(migrated[1].doubleBookingMatch).toBe(migrated[0].id)
    expect(migrateOldIds(migrated, raw)).toBe(migrated)
  })
})
