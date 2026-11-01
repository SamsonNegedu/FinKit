// Persists the current session in IndexedDB so a refresh doesn't lose work.
// Every call is wrapped: storage can be blocked (private mode) and the app must still work.
import { Transaction, RawTransaction, DateRange } from '@/shared/types'
import type { SplitMap } from './splits'

interface SavedSession {
  transactions: Transaction[]
  raw: RawTransaction[]
  dateRange: { start: string; end: string } | null
  anonymizationEnabled: boolean
  splits?: SplitMap
  savedAt: number
}

const DB_NAME = 'finkit'
const STORE = 'session'
const KEY = 'current'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)

    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()

  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export async function saveSession(data: {
  transactions: Transaction[]
  raw: RawTransaction[]
  dateRange: DateRange | null
  anonymizationEnabled: boolean
  splits: SplitMap
}): Promise<void> {
  try {
    const payload: SavedSession = {
      transactions: data.transactions,
      raw: data.raw,
      dateRange: data.dateRange
        ? { start: data.dateRange.startDate.toISOString(), end: data.dateRange.endDate.toISOString() }
        : null,
      anonymizationEnabled: data.anonymizationEnabled,
      splits: data.splits,
      savedAt: Date.now(),
    }

    await run('readwrite', s => s.put(payload, KEY))
  } catch {
    // Persistence is a convenience only
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const result = await run<SavedSession | undefined>('readonly', s => s.get(KEY))

    return result ?? null
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  try {
    await run('readwrite', s => s.delete(KEY))
  } catch {
    // ignore
  }
}

// Whether to keep the session on this device at all (raw bank rows are stored unencrypted)
const REMEMBER_KEY = 'finkit.remember'

export function getRememberPreference(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setRememberPreference(on: boolean): void {
  try {
    localStorage.setItem(REMEMBER_KEY, on ? 'on' : 'off')
  } catch {
    // ignore
  }
}
