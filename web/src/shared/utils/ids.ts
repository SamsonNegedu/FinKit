import { RawTransaction, Transaction } from '@/shared/types'

// Small non-crypto hash (FNV-1a) - ids only need to be stable, not secret
export function hashKey(input: string): string {
  let h = 0x811c9dc5

  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }

  return (h >>> 0).toString(36)
}

export function rawKey(raw: RawTransaction): string {
  // A bank's own transaction id is the best identity: it survives reconnects and re-fetches
  if (raw.externalId) {
    return `ext:${raw.externalId}`
  }

  return [raw.date, raw.amount, raw.description, raw.recipient || '', raw.recipientIban || ''].join('|')
}

/**
 * The key that ties a workspace transaction to its server copy (its trip, its ref). A processed row has an absolute
 * amount and maybe anonymized text, so for a bank that sends no transaction id the key cannot be rebuilt from it.
 */
export function linkKey(tx: Transaction): string {
  return tx.sourceKey ?? rawKey(tx)
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

    return { ...tx, id: `tx_${hashKey(key)}_${n}`, sourceKey: key }
  })
}

// Sessions saved before stable ids used "tx_<timestamp>_<row index>". Map each to the new
// content-based id (via the raw row at that index) so earlier manual edits keep working.
export function migrateOldIds(txs: Transaction[], raw: RawTransaction[]): Transaction[] {
  const old = /^tx_\d{12,}_(\d+)$/

  if (!txs.some(t => old.test(t.id))) {
    return txs
  }
  const seen = new Map<string, number>()
  const newIds = raw.map(r => {
    const key = rawKey(r)
    const n = (seen.get(key) || 0) + 1

    seen.set(key, n)

    return `tx_${hashKey(key)}_${n}`
  })
  const idMap = new Map<string, string>()

  for (const t of txs) {
    const m = old.exec(t.id)

    if (m && newIds[Number(m[1])]) {
      idMap.set(t.id, newIds[Number(m[1])])
    }
  }

  return txs.map(t => ({
    ...t,
    id: idMap.get(t.id) ?? t.id,
    doubleBookingMatch: t.doubleBookingMatch ? (idMap.get(t.doubleBookingMatch) ?? t.doubleBookingMatch) : undefined,
  }))
}
