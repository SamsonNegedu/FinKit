import { Transaction } from '../types'

export interface SplitPart {
  amount: number
  category: string
  isExcluded?: boolean
}

// Keeps the original so a split can be undone or edited, even after re-processing
export interface SplitRecord {
  parent: Transaction
  parts: SplitPart[]
}

export type SplitMap = Record<string, SplitRecord>

const round2 = (n: number) => Math.round(n * 100) / 100

export function remaining(total: number, parts: SplitPart[]): number {
  return round2(total - parts.reduce((s, p) => s + (Number(p.amount) || 0), 0))
}

export function isValidSplit(total: number, parts: SplitPart[]): boolean {
  return parts.length >= 2 && parts.every(p => p.amount > 0 && p.category) && Math.abs(remaining(total, parts)) < 0.005
}

function childrenOf(parent: Transaction, parts: SplitPart[]): Transaction[] {
  return parts.map((p, i) => ({
    ...parent,
    id: `${parent.id}~${i + 1}`,
    amount: round2(p.amount),
    category: p.category,
    categorySource: 'manual' as const,
    isExcluded: p.isExcluded ?? parent.isExcluded,
    excludedManually: p.isExcluded !== undefined ? true : parent.excludedManually,
    splitOf: parent.id,
    isRecurring: false,
  }))
}

/** Replace each split parent by its parts. Parents missing from the list are ignored. */
export function applySplits(txs: Transaction[], splits: SplitMap): Transaction[] {
  const out: Transaction[] = []
  for (const t of txs) {
    const record = splits[t.id]
    if (record && isValidSplit(t.amount, record.parts)) out.push(...childrenOf(t, record.parts))
    else out.push(t)
  }
  return out
}

/** Put the original transaction back where its parts were. */
export function removeSplit(txs: Transaction[], parentId: string, original: Transaction): Transaction[] {
  const out: Transaction[] = []
  let inserted = false
  for (const t of txs) {
    if (t.splitOf === parentId) {
      if (!inserted) out.push(original)
      inserted = true
    } else {
      out.push(t)
    }
  }
  return out
}

/**
 * Copy edits made to split parts (category, excluded) back into the stored split, so they
 * survive re-processing. Records whose parts aren't all present are left unchanged.
 */
export function syncSplits(splits: SplitMap, txs: Transaction[]): SplitMap {
  const byId = new Map<string, Transaction>()
  for (const t of txs) if (t.splitOf) byId.set(t.id, t)
  if (byId.size === 0) return splits

  let changed = false
  const next: SplitMap = {}
  for (const [id, record] of Object.entries(splits)) {
    const children = record.parts.map((_, i) => byId.get(`${id}~${i + 1}`))
    if (children.some(c => !c)) {
      next[id] = record
      continue
    }
    const parts = record.parts.map((p, i) => {
      const c = children[i]!
      const category = c.category || p.category
      const isExcluded = c.excludedManually ? !!c.isExcluded : p.isExcluded
      if (category === p.category && isExcluded === p.isExcluded) return p
      changed = true
      return { ...p, category, isExcluded }
    })
    next[id] = parts === record.parts ? record : { ...record, parts }
  }
  return changed ? next : splits
}
