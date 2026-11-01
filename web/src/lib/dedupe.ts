import { RawTransaction } from '../types'
import { rawKey } from './ids'

/**
 * Merge a new import into existing rows without double counting.
 * Counts occurrences, so two genuine identical purchases on one day still both survive,
 * but a row already present (from an overlapping file) is skipped.
 */
export function mergeWithoutDuplicates(
  existing: RawTransaction[],
  incoming: RawTransaction[]
): { merged: RawTransaction[]; added: number; skipped: number } {
  const available = new Map<string, number>()
  for (const r of existing) {
    const key = rawKey(r)
    available.set(key, (available.get(key) || 0) + 1)
  }
  const fresh: RawTransaction[] = []
  let skipped = 0
  for (const r of incoming) {
    const key = rawKey(r)
    const left = available.get(key) || 0
    if (left > 0) {
      available.set(key, left - 1)
      skipped++
    } else {
      fresh.push(r)
    }
  }
  return { merged: [...existing, ...fresh], added: fresh.length, skipped }
}
