import { RawTransaction, Transaction } from '../types'

// Small non-crypto hash (FNV-1a) - ids only need to be stable, not secret
function hash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

export function rawKey(raw: RawTransaction): string {
  return [raw.date, raw.amount, raw.description, raw.recipient || '', raw.recipientIban || ''].join('|')
}

/**
 * Ids come from the transaction's content (not the time or position), so re-processing the
 * same data gives the same ids and manual edits can be carried over by id.
 * Identical rows get a counter so they stay distinct.
 */
export function assignStableIds(processed: Transaction[], raw: RawTransaction[]): Transaction[] {
  const seen = new Map<string, number>()
  return processed.map((tx, i) => {
    const key = rawKey(raw[i])
    const n = (seen.get(key) || 0) + 1
    seen.set(key, n)
    return { ...tx, id: `tx_${hash(key)}_${n}` }
  })
}
