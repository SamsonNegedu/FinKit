import { Transaction } from '../types'

export interface SplitPart {
  amount: number
  category: string
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

export function childrenOf(parent: Transaction, parts: SplitPart[]): Transaction[] {
  return parts.map((p, i) => ({
    ...parent,
    id: `${parent.id}~${i + 1}`,
    amount: round2(p.amount),
    category: p.category,
    categorySource: 'manual' as const,
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
