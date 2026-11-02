import type { Transaction } from '@/shared/types'
import { MS_PER_DAY } from '@/shared/constants/time'
import { displayNameOf } from '@/shared/utils/aliases'
import { isCashWithdrawal } from '@/shared/utils/cashWithdrawal'
import { getCategoryColor, normalizeMerchant } from '@/shared/utils/categorizer'
import { parseLocalDate } from '@/shared/utils/dates'

/** Money put aside is not money spent: it gets its own line, as in your sheet. */
/** Money put away, not spent: left out of "spent" everywhere, including the overall budget cap. */
export const SET_ASIDE = new Set(['Savings', 'Investment'])

export interface CategoryRow {
  category: string
  total: number
  count: number
  /** Share of everything spent */
  share: number
  color: string
  /** What it was in the period before; null when there is no earlier period to compare with */
  previous: number | null
}
export interface MerchantRow {
  merchant: string
  total: number
  count: number
}
export interface Analysis {
  income: number
  spent: number
  setAside: number
  /** Spending that repeats (flagged recurring), and its share of all spending */
  repeating: number
  avgDaily: number
  categories: CategoryRow[]
  merchants: MerchantRow[]
  largest: { tx: Transaction; name: string } | null
  /** Cash taken out that has not been given a purpose yet */
  untaggedCash: { count: number; total: number }
  /** Spending in the period before, for the headline comparison; null for "all time" */
  previousSpent: number | null
}

const spendingOf = (txs: Transaction[]) =>
  txs.filter(t => t.type === 'expense' && t.category !== 'Transfer' && !t.isExcluded)

const untaggedCashOf = (spending: Transaction[]) => {
  const rows = spending.filter(t => isCashWithdrawal(t) && t.category === 'Cash' && t.categorySource !== 'manual')

  return { count: rows.length, total: rows.reduce((sum, t) => sum + t.amount, 0) }
}

const totalBy = (txs: Transaction[], key: (t: Transaction) => string) => {
  const out = new Map<string, number>()

  for (const t of txs) {
    out.set(key(t), (out.get(key(t)) ?? 0) + t.amount)
  }

  return out
}

/** What was spent and where, with every category listed and merchants merged however they were typed. */
export function analyze(rows: Transaction[], earlier: Transaction[] | null, days: number): Analysis {
  const all = spendingOf(rows)
  const spending = all.filter(t => !SET_ASIDE.has(t.category || ''))
  const spent = spending.reduce((sum, t) => sum + t.amount, 0)
  const before = earlier ? spendingOf(earlier).filter(t => !SET_ASIDE.has(t.category || '')) : null
  const prevByCategory = before ? totalBy(before, t => t.category || 'Other') : null
  const counts = new Map<string, number>()

  for (const t of spending) {
    counts.set(t.category || 'Other', (counts.get(t.category || 'Other') ?? 0) + 1)
  }
  const categories = [...totalBy(spending, t => t.category || 'Other')]
    .map(([category, total]) => ({
      category,
      total,
      count: counts.get(category) ?? 0,
      share: spent > 0 ? (total / spent) * 100 : 0,
      color: getCategoryColor(category),
      previous: prevByCategory ? (prevByCategory.get(category) ?? 0) : null,
    }))
    .sort((a, b) => b.total - a.total)

  // "Scalable Capital" and "Scalable capital" are one merchant: group on the normalized name, show the first spelling
  const merchants = new Map<string, MerchantRow>()

  for (const t of spending) {
    const name = displayNameOf(t)
    const key = normalizeMerchant(name) || name
    const m = merchants.get(key) ?? { merchant: name, total: 0, count: 0 }

    merchants.set(key, { ...m, total: m.total + t.amount, count: m.count + 1 })
  }
  const biggest = spending.reduce<Transaction | null>((best, t) => (!best || t.amount > best.amount ? t : best), null)

  const income = rows
    .filter(t => t.type === 'income' && t.category !== 'Transfer' && !t.isExcluded)
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    income,
    spent,
    setAside: all.filter(t => SET_ASIDE.has(t.category || '')).reduce((sum, t) => sum + t.amount, 0),
    repeating: spending.filter(t => t.isRecurring).reduce((sum, t) => sum + t.amount, 0),
    avgDaily: days > 0 ? spent / days : 0,
    categories,
    merchants: [...merchants.values()].sort((a, b) => b.total - a.total),
    largest: biggest ? { tx: biggest, name: displayNameOf(biggest) } : null,
    untaggedCash: untaggedCashOf(spending),
    previousSpent: before ? before.reduce((sum, t) => sum + t.amount, 0) : null,
  }
}

export const daysIn = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1

/** With no period chosen, the days from the first to the last transaction. */
export function spanDays(rows: Transaction[]): number {
  if (rows.length === 0) {
    return 1
  }
  const times = rows.map(t => parseLocalDate(t.date).getTime())

  return daysIn(new Date(Math.min(...times)), new Date(Math.max(...times)))
}
