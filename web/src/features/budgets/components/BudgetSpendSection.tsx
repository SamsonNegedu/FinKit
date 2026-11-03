import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import Select from '@/shared/components/forms/Select'
import BudgetListHead from './BudgetListHead'
import BudgetRowCard from './BudgetRowCard'
import type { BudgetRow, HistoryMonth } from '../utils/budgetProgress'

export default function BudgetSpendSection({
  many,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  spendCount,
  shownCount,
  fold,
  showOk,
  onToggleShowOk,
  attention,
  onTrack,
  shown,
  goalRows,
  history,
  removePending,
  onOpenCategory,
  onChangeAmount,
  onRemove,
  onToggleRollover,
}: {
  many: boolean
  search: string
  onSearchChange: (value: string) => void
  filter: string
  onFilterChange: (value: string) => void
  spendCount: number
  shownCount: number
  fold: boolean
  showOk: boolean
  onToggleShowOk: () => void
  attention: BudgetRow[]
  onTrack: BudgetRow[]
  shown: BudgetRow[]
  goalRows: BudgetRow[]
  history: Map<string, HistoryMonth[]>
  removePending: boolean
  onOpenCategory: (category: string) => void
  onChangeAmount: (row: BudgetRow, amount: number) => void
  onRemove: (row: BudgetRow) => void
  onToggleRollover: (row: BudgetRow) => void
}) {
  const card = (r: BudgetRow) => (
    <BudgetRowCard
      key={r.category}
      row={r}
      history={history.get(r.category)}
      busy={removePending}
      onOpen={() => onOpenCategory(r.category)}
      onChange={amount => onChangeAmount(r, amount)}
      onRemove={() => onRemove(r)}
      onToggleRollover={() => onToggleRollover(r)}
    />
  )

  return (
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
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
          <Select
            className="w-40"
            ariaLabel="Show"
            value={filter}
            onChange={onFilterChange}
            options={[
              { value: 'all', label: 'All budgets' },
              { value: 'over', label: 'Over' },
              { value: 'watch', label: 'Close to limit' },
              { value: 'ok', label: 'On track' },
            ]}
          />
        </div>
      )}
      {spendCount > 0 && shownCount === 0 && <p className="py-2 text-sm text-midnight-400">No budgets match.</p>}
      <BudgetListHead labels={['Used', 'Spent', 'Limit', 'Left', 'Last 6 months']} />
      <ul className="divide-y divide-line">{(fold ? attention : shown).map(card)}</ul>
      {fold && onTrack.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1 pt-3 text-sm text-midnight-300 hover:text-ink"
            aria-expanded={showOk}
            onClick={onToggleShowOk}
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
  )
}
