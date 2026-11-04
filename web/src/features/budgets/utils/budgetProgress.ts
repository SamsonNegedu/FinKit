import { countedDate } from '@/shared/utils/countsToMonth'
import type { Transaction } from '@/shared/types'
import { parseLocalDate } from '@/shared/utils/dates'
import { formatCurrency } from '@/shared/utils/format'
import { SET_ASIDE } from '@/shared/utils/analysis/analyze'

export interface BudgetLimit {
  category: string
  currency: string
  amount: number
  /** Unspent money carries into the next month */
  rollover?: boolean
  /** The month ("2026-11") the budget began: carrying over counts from here */
  startsMonth?: string | null
}
export interface BudgetRow extends BudgetLimit {
  /** The limit set for each month. `amount` is this plus what was carried in */
  base: number
  /** Unspent money carried in from earlier months (0 unless rollover is on) */
  carried: number
  spent: number
  left: number
  /** Share of the limit used, uncapped so an overspend can be told from "exactly on budget" */
  used: number
  /** Where the month ends up if spending keeps its pace; null on the first day or when the month is over */
  projected: number | null
  /** How far through the month today is (0-1), for the "today" marker; null for a month that is over */
  paceAt: number | null
  state: 'ok' | 'watch' | 'over'
  /**
   * Money put away (Savings, Investment) is a target to reach, not a limit to stay under: it is never "over" or
   * "close", and it is left out of what is left to spend.
   */
  goal: boolean
}

/** A pace from the first days of a month is mostly noise (one shop on day 2 is not a trend), so none is shown before this day. */
export const MIN_PACE_DAYS = 7

/** At this share of the limit a budget starts to warn. */
export const WATCH_AT = 0.8

export function budgetUsedState(used: number): BudgetRow['state'] {
  if (used > 1) {
    return 'over'
  }
  if (used >= WATCH_AT) {
    return 'watch'
  }

  return 'ok'
}

/**
 * Spending is counted exactly as Analytics counts it (expenses, no transfers, nothing excluded), so a budget
 * and the category breakdown never disagree about what was spent.
 */
export function spentByCategory(transactions: Transaction[], year: number, month: number): Map<string, number> {
  const out = new Map<string, number>()

  for (const t of transactions) {
    const d = parseLocalDate(countedDate(t))

    if (d.getFullYear() !== year || d.getMonth() !== month) {
      continue
    }
    if (t.type !== 'expense' || t.category === 'Transfer' || t.isExcluded) {
      continue
    }
    const category = t.category || 'Other'

    out.set(category, (out.get(category) ?? 0) + t.amount)
  }

  return out
}

/** How far back carrying over is worked out, so an old budget never walks years of history. */
const MAX_ROLLOVER_MONTHS = 36

export const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`

/** What was spent per category in every month, from one pass over the transactions. */
function spentByMonth(transactions: Transaction[]): Map<number, Map<string, number>> {
  const out = new Map<number, Map<string, number>>()

  for (const t of transactions) {
    if (t.type !== 'expense' || t.category === 'Transfer' || t.isExcluded) {
      continue
    }
    const d = parseLocalDate(countedDate(t))
    const index = d.getFullYear() * 12 + d.getMonth()
    const month = out.get(index) ?? new Map<string, number>()
    const category = t.category || 'Other'

    month.set(category, (month.get(category) ?? 0) + t.amount)
    out.set(index, month)
  }

  return out
}

/**
 * What a rollover budget brings into a month: each month's limit plus what came in, less what was spent, if
 * anything is left. Only unspent money carries; an overspend is not taken off the next month. Counting starts
 * in the month the budget began, using the limit as it is now (limits are not kept per month).
 */
function carriedInto(l: BudgetLimit, byMonth: Map<number, Map<string, number>>, year: number, month: number): number {
  if (!l.rollover || !l.startsMonth) {
    return 0
  }
  const [sy, sm] = l.startsMonth.split('-').map(Number)
  const target = year * 12 + month
  let carry = 0

  for (let i = Math.max(sy * 12 + (sm - 1), target - MAX_ROLLOVER_MONTHS); i < target; i++) {
    carry = Math.max(0, l.amount + carry - (byMonth.get(i)?.get(l.category) ?? 0))
  }

  return carry
}

export function budgetRows(
  limits: BudgetLimit[],
  transactions: Transaction[],
  currency: string,
  today: Date,
  year: number,
  month: number,
): BudgetRow[] {
  const byMonth = spentByMonth(transactions)
  const spent = byMonth.get(year * 12 + month) ?? new Map<string, number>()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrent = today.getFullYear() === year && today.getMonth() === month
  const elapsed = isCurrent ? today.getDate() : daysInMonth

  return limits
    .filter(l => l.currency === currency)
    .map(l => {
      const carried = carriedInto(l, byMonth, year, month)
      const limit = l.amount + carried
      const s = spent.get(l.category) ?? 0
      const used = s / limit
      const goal = SET_ASIDE.has(l.category)

      return {
        ...l,
        base: l.amount,
        carried,
        amount: limit,
        spent: s,
        left: limit - s,
        used,
        projected: isCurrent && elapsed >= MIN_PACE_DAYS && elapsed < daysInMonth ? (s / elapsed) * daysInMonth : null,
        paceAt: isCurrent ? elapsed / daysInMonth : null,
        goal,
        state: goal
          ? ('ok' as const)
          : used > 1
            ? ('over' as const)
            : used >= WATCH_AT
              ? ('watch' as const)
              : ('ok' as const),
      }
    })
    .sort((a, b) => b.used - a.used)
}

export interface CapSummary {
  cap: number
  spent: number
  left: number
  used: number
  state: 'ok' | 'watch' | 'over'
}

/**
 * The overall monthly cap against everything spent in the month. It counts spending as Analytics' "Spent" does,
 * so money put into Savings or Investment is not part of it, and it includes categories that have no budget.
 */
export function capSummary(
  caps: Array<{ currency: string; amount: number }>,
  transactions: Transaction[],
  currency: string,
  year: number,
  month: number,
): CapSummary | null {
  const cap = caps.find(c => c.currency === currency)?.amount

  if (!cap) {
    return null
  }
  let spent = 0

  for (const [category, amount] of spentByCategory(transactions, year, month)) {
    if (!SET_ASIDE.has(category)) {
      spent += amount
    }
  }
  const used = spent / cap

  return {
    cap,
    spent,
    left: cap - spent,
    used,
    state: budgetUsedState(used),
  }
}

export interface BudgetTotals {
  budgeted: number
  spent: number
  left: number
  over: number
  watch: number
}

/** What is left to spend across the spending budgets. Put-away goals are not spending, so they are not in it. */
export const totalsOf = (all: BudgetRow[]): BudgetTotals => {
  const rows = all.filter(r => !r.goal)
  const budgeted = rows.reduce((n, r) => n + r.amount, 0)
  const spent = rows.reduce((n, r) => n + r.spent, 0)

  return {
    budgeted,
    spent,
    left: budgeted - spent,
    over: rows.filter(r => r.state === 'over').length,
    watch: rows.filter(r => r.state === 'watch').length,
  }
}

/**
 * This month's spending in categories that have no budget yet, biggest first. `scheduled` are categories paid on a
 * schedule (recurring payments): a limit on a bill that is the same every month says nothing, so they are left out.
 */
export function unbudgeted(
  transactions: Transaction[],
  limits: BudgetLimit[],
  year: number,
  month: number,
  scheduled: ReadonlySet<string> = new Set(),
) {
  const budgeted = new Set(limits.map(l => l.category))

  return [...spentByCategory(transactions, year, month)]
    .filter(([category, spent]) => !budgeted.has(category) && !scheduled.has(category) && spent > 0)
    .map(([category, spent]) => ({ category, spent }))
    .sort((a, b) => b.spent - a.spent)
}

/** What the last three full months averaged, rounded up to 10, as a starting point for a new limit. */
export function suggestLimit(
  transactions: Transaction[],
  category: string,
  year: number,
  month: number,
): number | null {
  const months = [1, 2, 3]
    .map(back => new Date(year, month - back, 1))
    .map(d => spentByCategory(transactions, d.getFullYear(), d.getMonth()).get(category) ?? 0)
    .filter(n => n > 0)

  return months.length ? Math.ceil(months.reduce((a, b) => a + b, 0) / months.length / 10) * 10 : null
}

/** Not spending, so there is nothing to budget. */
export const NOT_BUDGETABLE = new Set(['Transfer', 'Income'])

/** Categories you spent in over the last three months with no budget yet, each with a starting limit. */
export function setupSuggestions(
  transactions: Transaction[],
  limits: BudgetLimit[],
  year: number,
  month: number,
  scheduled: ReadonlySet<string> = new Set(),
) {
  const budgeted = new Set(limits.map(l => l.category))
  const seen = new Set<string>()

  for (const back of [1, 2, 3]) {
    const d = new Date(year, month - back, 1)

    for (const category of spentByCategory(transactions, d.getFullYear(), d.getMonth()).keys()) {
      seen.add(category)
    }
  }

  return [...seen]
    .filter(c => !budgeted.has(c) && !NOT_BUDGETABLE.has(c) && !scheduled.has(c))
    .flatMap(category => {
      const amount = suggestLimit(transactions, category, year, month)

      return amount === null ? [] : [{ category, amount }]
    })
    .sort((a, b) => b.amount - a.amount)
}

/** One line for the Overview: the budget furthest over, plus how many others need a look. Null when all is well. */
export function alertLine(rows: BudgetRow[], currency: string): string | null {
  const over = rows.filter(r => r.state === 'over').sort((a, b) => a.left - b.left)
  const watch = rows.filter(r => r.state === 'watch').length

  if (over.length === 0) {
    return watch === 0 ? null : `${watch} budget${watch === 1 ? '' : 's'} close to the limit`
  }
  const worst = `${over[0].category} is ${formatCurrency(-over[0].left, currency)} over budget`
  const more = over.length > 1 ? ` (${over.length - 1} more over)` : ''

  return `${worst}${more}${watch > 0 ? ` · ${watch} close to the limit` : ''}`
}

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
