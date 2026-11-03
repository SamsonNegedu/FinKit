import { useMemo, useState } from 'react'
import type { Transaction } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'
import { parseLocalDate } from '@/shared/utils/dates'
import { getAvailableCategories } from '@/shared/utils/categorizer/categoryMeta'
import type { MonthPick } from '../components/MonthSwitcher'
import {
  NOT_BUDGETABLE,
  budgetRows,
  budgetHistory,
  capSummary,
  setupSuggestions,
  totalsOf,
  unbudgeted,
  type BudgetLimit,
} from '../utils/budgetProgress'
import type { BudgetCap } from '../api/budgets.api'

/** More budgets than this and the page offers search and folds away the ones that are fine. */
export const BUDGET_MANY = 8

export function useBudgetsPageData(
  displayTransactions: Transaction[],
  baseCurrency: string,
  limits: BudgetLimit[],
  caps: BudgetCap[],
) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showOk, setShowOk] = useState(false)
  const [today] = useState(() => new Date())
  const thisMonth: MonthPick = { year: today.getFullYear(), month: today.getMonth() }
  const [view, setView] = useState<MonthPick>(thisMonth)
  const { year, month } = view
  const isCurrent = year === thisMonth.year && month === thisMonth.month
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const earliest = useMemo<MonthPick>(() => {
    let first = thisMonth.year * 12 + thisMonth.month

    for (const t of displayTransactions) {
      const d = parseLocalDate(t.date)

      first = Math.min(first, d.getFullYear() * 12 + d.getMonth())
    }

    return { year: Math.floor(first / 12), month: first % 12 }
    // thisMonth is fixed for the visit
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTransactions])
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const capPace = isCurrent ? today.getDate() / daysInMonth : null
  const cap = useMemo(
    () => capSummary(caps, displayTransactions, baseCurrency, year, month),
    [caps, displayTransactions, baseCurrency, year, month],
  )
  const budgetedTotal = limits.filter(l => l.currency === baseCurrency).reduce((sum, l) => sum + l.amount, 0)
  const rows = useMemo(
    () => budgetRows(limits, displayTransactions, baseCurrency, today, year, month),
    [limits, displayTransactions, baseCurrency, today, year, month],
  )
  const totals = useMemo(() => totalsOf(rows), [rows])
  const before = new Date(year, month - 1, 1)
  const previous = useMemo(() => {
    if (before.getFullYear() * 12 + before.getMonth() < earliest.year * 12 + earliest.month) {
      return null
    }
    const t = totalsOf(
      budgetRows(limits, displayTransactions, baseCurrency, today, before.getFullYear(), before.getMonth()),
    )

    if (t.budgeted === 0 || t.spent === 0) {
      return null
    }
    const name = before.toLocaleDateString('en-GB', { month: 'long' })
    const flagged = t.over > 0 ? ` · ${t.over} over` : ''

    return `${name}: ${formatCurrency(t.spent, baseCurrency)} of ${formatCurrency(t.budgeted, baseCurrency)}${flagged}`
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [limits, displayTransactions, baseCurrency, today, year, month, earliest])
  const history = useMemo(
    () => budgetHistory(limits, displayTransactions, baseCurrency, today, year, month, earliest),
    [limits, displayTransactions, baseCurrency, today, year, month, earliest],
  )
  const open = useMemo(
    () => unbudgeted(displayTransactions, limits, year, month).slice(0, 6),
    [displayTransactions, limits, year, month],
  )
  const suggestions = useMemo(
    () => setupSuggestions(displayTransactions, limits, year, month),
    [displayTransactions, limits, year, month],
  )
  const taken = new Set(rows.map(r => r.category))
  const choices = getAvailableCategories().filter(c => !taken.has(c) && !NOT_BUDGETABLE.has(c))
  const spendRows = rows.filter(r => !r.goal)
  const goalRows = rows.filter(r => r.goal)
  const many = spendRows.length > BUDGET_MANY
  const query = search.trim().toLowerCase()
  const shown = spendRows.filter(
    r => (filter === 'all' || r.state === filter) && (!query || r.category.toLowerCase().includes(query)),
  )
  const attention = shown.filter(r => r.state !== 'ok')
  const onTrack = shown.filter(r => r.state === 'ok')
  const fold = many && filter === 'all' && !query && attention.length > 0

  return {
    view,
    setView,
    thisMonth,
    earliest,
    isCurrent,
    monthLabel,
    capPace,
    cap,
    budgetedTotal,
    rows,
    totals,
    previous,
    history,
    open,
    suggestions,
    choices,
    spendRows,
    goalRows,
    many,
    search,
    setSearch,
    filter,
    setFilter,
    shown,
    attention,
    onTrack,
    fold,
    showOk,
    setShowOk,
  }
}
