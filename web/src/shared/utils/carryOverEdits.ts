import type { Transaction } from '@/shared/types'

/**
 * Transactions are worked out again from the raw rows whenever more arrive (a sync, another file) or the rules change.
 * What the person set by hand must survive that, so it is taken from the previous version of each row and laid back on:
 * a category and its subcategory, the month it counts toward, whether it was excluded, and a note.
 * What the app guessed (a rule or learned category, recurring, transfers) is recomputed, so a changed rule still reaches
 * old rows. Parts of a split are one-offs and are rebuilt from the split itself, so they are left alone here.
 */
export function carryOverEdits(previous: Transaction[], fresh: Transaction[]): Transaction[] {
  const before = new Map(previous.filter(t => !t.splitOf).map(t => [t.id, t]))

  return fresh.map(t => {
    const old = before.get(t.id)

    if (!old) {
      return t
    }
    let out = t

    if (old.categorySource === 'manual') {
      out = { ...out, category: old.category, categoryDetail: old.categoryDetail, categorySource: 'manual' }
    }
    if (old.countsToMonthSource === 'manual') {
      out = { ...out, countsToMonth: old.countsToMonth, countsToMonthSource: 'manual' }
    }
    if (old.excludedManually) {
      out = { ...out, isExcluded: old.isExcluded, excludedManually: true }
    }
    if (old.note) {
      out = { ...out, note: old.note }
    }

    return out
  })
}
