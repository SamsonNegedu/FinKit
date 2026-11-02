import { Transaction } from '@/shared/types'
import { isCashWithdrawal } from '@/shared/utils/cashWithdrawal'
import { getExpenseCategories, merchantKeyOf, sameMerchant } from '@/shared/utils/categorizer'

export function needsReview(tx: Transaction): boolean {
  return (
    tx.type === 'expense' &&
    !tx.isExcluded &&
    tx.categorySource !== 'manual' &&
    (!tx.category || tx.category === 'Other' || (tx.category === 'Cash' && isCashWithdrawal(tx)))
  )
}

export interface ReviewGroup {
  key: string
  items: Transaction[]
  total: number
}

export function buildReviewGroups(transactions: Transaction[]): ReviewGroup[] {
  const result: ReviewGroup[] = []

  for (const tx of transactions.filter(needsReview)) {
    // Every withdrawal reads the same, but each was for something: they are reviewed one at a time
    const key = isCashWithdrawal(tx) ? `${merchantKeyOf(tx)} · ${tx.date} · ${tx.amount}` : merchantKeyOf(tx)
    const group = result.find(g => sameMerchant(g.key, key))

    if (group) {
      group.items.push(tx)
      group.total += tx.amount
    } else {
      result.push({ key, items: [tx], total: tx.amount })
    }
  }

  return result.sort((a, b) => b.total - a.total)
}

export function reviewQuickPicks(transactions: Transaction[]): string[] {
  const counts = new Map<string, number>()

  for (const t of transactions) {
    if (t.type !== 'expense' || !t.category || t.category === 'Other' || t.category === 'Transfer') {
      continue
    }
    counts.set(t.category, (counts.get(t.category) || 0) + 1)
  }
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  const padded = [...used, ...getExpenseCategories().filter(c => c !== 'Other' && !used.includes(c))]

  return padded.slice(0, 9)
}
