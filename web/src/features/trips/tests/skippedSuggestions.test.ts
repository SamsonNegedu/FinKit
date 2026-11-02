import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSkipped, saveSkipped } from '../utils/skippedSuggestions'

// The tests run without a browser, so storage is a plain in-memory stand-in
let store: Record<string, string>

beforeEach(() => {
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
  })
})

describe('skipped trip suggestions', () => {
  it('are remembered per trip', () => {
    saveSkipped('a', new Set(['r1', 'r2']))
    expect([...loadSkipped('a')].sort()).toEqual(['r1', 'r2'])
    expect(loadSkipped('b').size).toBe(0)
  })

  it('survive damaged storage by starting empty', () => {
    store['finkit.trip-skipped.a'] = '{not json'
    expect(loadSkipped('a').size).toBe(0)
    store['finkit.trip-skipped.a'] = '"text"'
    expect(loadSkipped('a').size).toBe(0)
  })
})
