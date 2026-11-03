import type { Transaction } from '@/shared/types'
import { displayNameOf } from '@/shared/utils/aliases'
import { normalizeMerchant } from '@/shared/utils/categorizer'

export interface MerchantRow {
  merchant: string
  total: number
  count: number
}

/** One subcategory inside a category and who it went to; `detail` is null for what has no subcategory yet. */
export interface DetailRow {
  detail: string | null
  total: number
  count: number
  merchants: MerchantRow[]
}

/** Spending grouped by merchant, however the name was typed, biggest first. */
export function merchantsOf(txs: Transaction[]): MerchantRow[] {
  const byName = new Map<string, MerchantRow>()

  for (const t of txs) {
    const name = displayNameOf(t)
    const key = normalizeMerchant(name) || name
    const m = byName.get(key) ?? { merchant: name, total: 0, count: 0 }

    byName.set(key, { ...m, total: m.total + t.amount, count: m.count + 1 })
  }

  return [...byName.values()].sort((a, b) => b.total - a.total)
}

/**
 * The split of one category by subcategory, biggest first, with what is not sorted yet last. Empty when nothing in
 * the category has a subcategory, so a category nobody refined shows no split. The parent total never changes.
 */
export function detailsOf(txs: Transaction[]): DetailRow[] {
  if (!txs.some(t => t.categoryDetail)) {
    return []
  }
  const groups = new Map<string | null, Transaction[]>()

  for (const t of txs) {
    const key = t.categoryDetail ?? null

    const list = groups.get(key) ?? []

    list.push(t)
    groups.set(key, list)
  }

  return [...groups]
    .map(([detail, rows]) => ({
      detail,
      total: rows.reduce((sum, t) => sum + t.amount, 0),
      count: rows.length,
      merchants: merchantsOf(rows),
    }))
    .sort((a, b) => (a.detail === null ? 1 : b.detail === null ? -1 : b.total - a.total))
}
