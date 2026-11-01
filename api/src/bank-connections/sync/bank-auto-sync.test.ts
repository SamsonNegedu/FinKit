import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BankingConfig } from '../config/bank-connections.tokens'
import { BankAutoSync } from './bank-auto-sync'
import type { BankSyncService } from './bank-sync.service'

const make = (hours: number) => {
  const syncDue = vi.fn<(hours: number) => Promise<number>>(async () => 0)
  const auto = new BankAutoSync({ syncDue } as unknown as BankSyncService, { autoSyncHours: hours } as BankingConfig)

  return { auto, syncDue }
}

afterEach(() => vi.useRealTimers())

describe('scheduled sync timing', () => {
  it('catches up about a minute after start, then on every check', async () => {
    vi.useFakeTimers()
    const { auto, syncDue } = make(12)

    auto.onModuleInit()
    await vi.advanceTimersByTimeAsync(59_000)
    expect(syncDue).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(syncDue).toHaveBeenCalledTimes(1)
    expect(syncDue).toHaveBeenCalledWith(12)
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(syncDue).toHaveBeenCalledTimes(2)
    auto.onModuleDestroy()
  })

  it('does nothing when switched off, and stops when the app does', async () => {
    vi.useFakeTimers()
    const off = make(0)

    off.auto.onModuleInit()
    await vi.advanceTimersByTimeAsync(2 * 60 * 60_000)
    expect(off.syncDue).not.toHaveBeenCalled()

    const on = make(12)

    on.auto.onModuleInit()
    on.auto.onModuleDestroy()
    await vi.advanceTimersByTimeAsync(2 * 60 * 60_000)
    expect(on.syncDue).not.toHaveBeenCalled()
  })
})
