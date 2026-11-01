import { Transaction } from '../types'
import { merchantKeyOf, sameMerchant } from './categorizer'

interface RecategorizeResult {
  next: Transaction[]
  merchants: string[] // distinct merchant keys that were learned
  targetCount: number
  siblingCount: number // other transactions from the same merchants that were updated too
}

/**
 * Set a category on some transactions and carry it to every other transaction from the same
 * merchant that the user hasn't categorized by hand. Returns null if nothing matched.
 */
export function recategorize(
  current: Transaction[],
  ids: string[],
  category: string,
  extra: Partial<Transaction> = {},
): RecategorizeResult | null {
  const idSet = new Set(ids)
  const targets = current.filter(t => idSet.has(t.id))
  if (targets.length === 0) return null

  // Parts of a split are one-off allocations: they never teach or spread a merchant rule
  const merchants: string[] = []
  for (const t of targets) {
    if (t.splitOf) continue
    const key = merchantKeyOf(t)
    if (key && !merchants.some(m => sameMerchant(m, key))) merchants.push(key)
  }

  let siblingCount = 0
  const next = current.map(t => {
    if (idSet.has(t.id)) return { ...t, ...extra, category, categorySource: 'manual' as const }
    if (
      t.categorySource !== 'manual' &&
      t.category !== category &&
      merchants.some(m => sameMerchant(m, merchantKeyOf(t)))
    ) {
      siblingCount++
      return { ...t, category, categorySource: 'learned' as const }
    }
    return t
  })

  return { next, merchants, targetCount: targets.length, siblingCount }
}
