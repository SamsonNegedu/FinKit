import type { Transaction } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'
import { budgetRows } from './budgetProgress'
import type { BudgetLimit, BudgetRow } from './budgetProgress.types'

export interface HistoryMonth {
  /** "Sep" */
  label: string
  spent: number
  limit: number
  /** null when there was nothing to judge: before the data starts, or before the budget did and the category had no spending */
  state: 'ok' | 'watch' | 'over' | 'met' | 'short' | null
  /** The month still running: a goal not yet reached is not judged, there is time left */
  ongoing?: boolean
}

export function budgetLeftCaption(row: Pick<BudgetRow, 'left' | 'goal' | 'currency'>): {
  text: string
  tone: string
} {
  if (row.left >= 0) {
    const suffix = row.goal ? 'to go' : 'left'

    return { text: `${formatCurrency(row.left, row.currency)} ${suffix}`, tone: 'text-midnight-300' }
  }
  if (row.goal) {
    return { text: 'Goal reached', tone: 'text-cyan-400' }
  }

  return { text: `${formatCurrency(-row.left, row.currency)} over`, tone: 'text-negative' }
}

export function historyMonthState(row: BudgetRow | undefined, beforeBudget: boolean): HistoryMonth['state'] {
  // Before the budget began, only spending in the category says anything: a month with none is not a pass
  if (!row || (beforeBudget && row.spent === 0)) {
    return null
  }
  if (row.goal) {
    if (row.used >= 1) {
      return 'met'
    }

    return 'short'
  }

  return row.state
}

/**
 * How each budget fared in the last few months up to and including the one on screen (still running if it is this month), oldest first, to show which ones keep going over.
 * It uses the limit as it is now, as rollover does, because limits are not kept per month. A put-away goal is
 * "met" once it reached its goal that month. Months before the first transaction are null, and so are months before the budget began that have no spending in the category.
 */
export function budgetHistory(
  limits: BudgetLimit[],
  transactions: Transaction[],
  currency: string,
  today: Date,
  year: number,
  month: number,
  earliest: { year: number; month: number },
  count = 6,
): Map<string, HistoryMonth[]> {
  const out = new Map<string, HistoryMonth[]>()
  const first = earliest.year * 12 + earliest.month

  for (let back = count - 1; back >= 0; back--) {
    const d = new Date(year, month - back, 1)
    const index = d.getFullYear() * 12 + d.getMonth()
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const rows = index < first ? [] : budgetRows(limits, transactions, currency, today, d.getFullYear(), d.getMonth())
    const byCategory = new Map(rows.map(r => [r.category, r]))

    for (const l of limits.filter(x => x.currency === currency)) {
      const row = byCategory.get(l.category)
      const began = l.startsMonth ? l.startsMonth.split('-').map(Number) : null
      const beforeBudget = began !== null && index < began[0] * 12 + (began[1] - 1)
      const judged = historyMonthState(row, beforeBudget)
      const ongoing = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
      const state = ongoing && judged === 'short' ? null : judged

      out.set(l.category, [
        ...(out.get(l.category) ?? []),
        { label, spent: row?.spent ?? 0, limit: row?.amount ?? l.amount, state, ...(ongoing ? { ongoing } : {}) },
      ])
    }
  }

  return out
}
