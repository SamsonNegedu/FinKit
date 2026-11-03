import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react'
import { useApp } from '@/shared/contexts/AppState'
import Select from '@/shared/components/forms/Select'
import PageHeader from '@/shared/components/layout/PageHeader'
import { formatCurrency } from '@/shared/utils/format'
import { parseLocalDate } from '@/shared/utils/dates'
import CategoryIcon from '@/shared/components/CategoryIcon'
import { getAvailableCategories } from '@/shared/utils/categorizer/categoryMeta'
import BudgetSetupDialog from '../components/BudgetSetupDialog'
import BudgetDialog from '../components/BudgetDialog'
import BudgetRowCard, { BUDGET_COLUMNS } from '../components/BudgetRowCard'
import BudgetCapCard from '../components/BudgetCapCard'
import BudgetCapDialog from '../components/BudgetCapDialog'
import BudgetSummary from '../components/BudgetSummary'
import MonthSwitcher, { type MonthPick } from '../components/MonthSwitcher'
import { useBudgets, useDeleteBudget, useDeleteCap, useSaveBudget, useSaveCap } from '../hooks/budgets-queries'
import {
  NOT_BUDGETABLE,
  budgetRows,
  budgetHistory,
  capSummary,
  monthKey,
  setupSuggestions,
  suggestLimit,
  totalsOf,
  unbudgeted,
} from '../utils/budgetProgress'

/** More budgets than this and the page offers search and folds away the ones that are fine. */
const MANY = 8

/** Monthly limits per category. The limits live on the server; spending is worked out here from your transactions. */
export default function BudgetsPage() {
  const { displayTransactions, baseCurrency } = useApp()
  const navigate = useNavigate()
  const { data, isLoading, error } = useBudgets()
  const limits = useMemo(() => data?.budgets ?? [], [data])
  const caps = useMemo(() => data?.caps ?? [], [data])
  const save = useSaveBudget()
  const remove = useDeleteBudget()
  const saveCap = useSaveCap()
  const removeCap = useDeleteCap()
  const [capOpen, setCapOpen] = useState(false)
  // null: closed. '': open with nothing chosen. A name: open for that category
  const [adding, setAdding] = useState<string | null>(null)
  // Fixed for the visit, so the pace does not shift while the page is open
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [setup, setSetup] = useState(false)
  const [showOk, setShowOk] = useState(false)
  const [today] = useState(() => new Date())
  const thisMonth: MonthPick = { year: today.getFullYear(), month: today.getMonth() }
  const [view, setView] = useState<MonthPick>(thisMonth)
  const { year, month } = view
  const isCurrent = year === thisMonth.year && month === thisMonth.month
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  // The first month with any transaction: there is nothing to look back at before it
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
  // How the month before went, to put this one in context. Nothing when there is no data that far back.
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
    // `before` follows year and month
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
  // Income and transfers are not spending, so there is nothing to budget
  const choices = getAvailableCategories().filter(c => !taken.has(c) && !NOT_BUDGETABLE.has(c))
  // Money put away is a goal to reach, so it is listed apart from the limits to stay under
  const spendRows = rows.filter(r => !r.goal)
  const goalRows = rows.filter(r => r.goal)
  const many = spendRows.length > MANY
  const query = search.trim().toLowerCase()
  const shown = spendRows.filter(
    r => (filter === 'all' || r.state === filter) && (!query || r.category.toLowerCase().includes(query)),
  )
  const attention = shown.filter(r => r.state !== 'ok')
  const onTrack = shown.filter(r => r.state === 'ok')
  // With many budgets, the ones that are fine fold away so the page opens on what needs a look
  const fold = many && filter === 'all' && !query && attention.length > 0
  const card = (r: (typeof rows)[number]) => (
    <BudgetRowCard
      key={r.category}
      row={r}
      history={history.get(r.category)}
      busy={remove.isPending}
      onOpen={() => toCategory(r.category)}
      onChange={amount => void put(r.category, amount).catch(() => undefined)}
      onRemove={() => remove.mutate(r)}
      onToggleRollover={() => void put(r.category, r.base, !r.rollover).catch(() => undefined)}
    />
  )
  const toCategory = (category: string) => navigate({ to: '/transactions', search: { cat: [category] } })
  // Changing a limit keeps whether it rolls over, and the month it began; a new budget begins this month
  const put = (category: string, amount: number, rollover?: boolean) => {
    const existing = limits.find(l => l.category === category && l.currency === baseCurrency)

    return save.mutateAsync({
      category,
      currency: baseCurrency,
      amount,
      rollover: rollover ?? existing?.rollover ?? false,
      startsMonth: existing?.startsMonth ?? monthKey(thisMonth.year, thisMonth.month),
    })
  }
  const failure = (save.error ?? remove.error ?? saveCap.error ?? removeCap.error ?? error)?.message

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="A monthly limit per category. Spending is counted from your transactions, the same way as in Analytics."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <MonthSwitcher value={view} min={earliest} max={thisMonth} onChange={setView} />
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setAdding('')}>
              <Plus className="h-4 w-4" /> Add budget
            </button>
          </div>
        }
      />
      {failure && !adding && !capOpen && <p className="text-sm text-negative">{failure}</p>}
      {spendRows.length > 0 && (
        <BudgetSummary
          totals={totals}
          currency={baseCurrency}
          paceAt={capPace}
          previous={previous}
          onSetCap={cap ? undefined : () => setCapOpen(true)}
        />
      )}
      {cap && (
        <BudgetCapCard
          cap={cap}
          currency={baseCurrency}
          paceAt={capPace}
          onEdit={() => setCapOpen(true)}
          onRemove={() => removeCap.mutate(baseCurrency)}
        />
      )}
      {isLoading ? null : rows.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-midnight-400">
            No budgets yet. Set them up from your spending, or add one to see how this month is going.
          </p>
          {suggestions.length > 0 && (
            <button className="btn-secondary" onClick={() => setSetup(true)}>
              Set up from my spending
            </button>
          )}
        </div>
      ) : (
        <>
          <section className="card space-y-1 divide-y divide-line">
            {many && (
              <div className="flex flex-wrap items-center gap-2 pb-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-midnight-400" />
                  <input
                    className="input w-48 pl-8 text-sm"
                    placeholder="Search budgets"
                    aria-label="Search budgets"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  className="w-40"
                  ariaLabel="Show"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: 'All budgets' },
                    { value: 'over', label: 'Over' },
                    { value: 'watch', label: 'Close to limit' },
                    { value: 'ok', label: 'On track' },
                  ]}
                />
              </div>
            )}
            {spendRows.length > 0 && shown.length === 0 && (
              <p className="py-2 text-sm text-midnight-400">No budgets match.</p>
            )}
            <ListHead labels={['Used', 'Spent', 'Limit', 'Left', 'Last 6 months']} />
            <ul className="divide-y divide-line">{(fold ? attention : shown).map(card)}</ul>
            {fold && onTrack.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1 pt-3 text-sm text-midnight-300 hover:text-ink"
                  aria-expanded={showOk}
                  onClick={() => setShowOk(v => !v)}
                >
                  {showOk ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {onTrack.length} on track
                </button>
                {showOk && <ul className="divide-y divide-line">{onTrack.map(card)}</ul>}
              </div>
            )}
            {goalRows.length > 0 && (
              <div className="!border-t-0 pt-4">
                <h2 className="pb-1 text-xs uppercase tracking-wide text-midnight-500">
                  Put away <span className="normal-case">· a goal to reach, not counted as spent</span>
                </h2>
                <ul className="divide-y divide-line">{goalRows.map(card)}</ul>
              </div>
            )}
          </section>
        </>
      )}
      {open.length > 0 && (
        <section className="card space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-midnight-400">
              Spent {isCurrent ? 'this month' : `in ${monthLabel}`} with no budget
            </h2>
            {suggestions.length > 0 && rows.length > 0 && (
              <button className="text-sm text-positive hover:underline" onClick={() => setSetup(true)}>
                Suggest limits for these
              </button>
            )}
          </div>
          <ul className="divide-y divide-line">
            {open.map(o => (
              <li key={o.category} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <CategoryIcon category={o.category} size="sm" />
                  {o.category}
                </span>
                <span className="flex items-center gap-3 tabular-nums text-midnight-300">
                  {formatCurrency(o.spent, baseCurrency)}
                  <button className="text-positive hover:underline" onClick={() => setAdding(o.category)}>
                    Set budget
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {setup && (
        <BudgetSetupDialog
          suggestions={suggestions}
          currency={baseCurrency}
          busy={save.isPending}
          error={failure}
          onSave={picked => Promise.all(picked.map(p => put(p.category, p.amount))).then(() => setSetup(false))}
          onClose={() => setSetup(false)}
        />
      )}
      {capOpen && (
        <BudgetCapDialog
          current={cap?.cap ?? null}
          currency={baseCurrency}
          suggested={budgetedTotal}
          busy={saveCap.isPending}
          error={failure}
          onSave={amount => saveCap.mutateAsync({ currency: baseCurrency, amount })}
          onClose={() => setCapOpen(false)}
        />
      )}
      {adding !== null && (
        <BudgetDialog
          // A new key resets the form when it is reopened for another category
          key={adding}
          categories={choices}
          initial={adding}
          currency={baseCurrency}
          suggest={c => suggestLimit(displayTransactions, c, year, month)}
          busy={save.isPending}
          error={failure}
          onSave={(category, amount, rollover) => put(category, amount, rollover)}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  )
}

/** Column headings over a list of budgets, lined up with the rows. Hidden on a phone, where a row names its own parts. */
function ListHead({ labels }: { labels: [string, string, string, string, string] }) {
  return (
    <div aria-hidden="true" className={`hidden gap-x-4 pb-1 text-xs text-midnight-500 sm:grid ${BUDGET_COLUMNS}`}>
      <span>Category</span>
      <span>{labels[0]}</span>
      <span className="text-right">{labels[1]}</span>
      <span className="text-right">{labels[2]}</span>
      <span className="text-right">{labels[3]}</span>
      <span className="text-right">{labels[4]}</span>
      <span />
    </div>
  )
}
