import { useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import Checkbox from '@/shared/components/forms/Checkbox'
import ConfirmDialog from '@/shared/components/forms/ConfirmDialog'
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
  scheduledRows,
  history,
  removePending,
  onOpenCategory,
  onChangeAmount,
  onRemove,
  onRemoveMany,
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
  /** Budgets on categories paid on a schedule, which need no limit */
  scheduledRows: BudgetRow[]
  history: Map<string, HistoryMonth[]>
  removePending: boolean
  onOpenCategory: (category: string) => void
  onChangeAmount: (row: BudgetRow, amount: number) => void
  onRemove: (row: BudgetRow) => void
  onRemoveMany: (rows: BudgetRow[]) => Promise<unknown>
  onToggleRollover: (row: BudgetRow) => void
}) {
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const visible = [...(fold ? attention : shown), ...(fold && showOk ? onTrack : []), ...goalRows]
  const chosen = [...visible, ...scheduledRows.filter(r => !visible.includes(r))].filter(r => picked.has(r.category))
  const stop = () => {
    setSelecting(false)
    setPicked(new Set())
  }
  const pick = (category: string, on: boolean) =>
    setPicked(prev => {
      const next = new Set(prev)

      if (on) {
        next.add(category)
      } else {
        next.delete(category)
      }

      return next
    })
  const card = (r: BudgetRow) => (
    <BudgetRowCard
      key={r.category}
      row={r}
      history={history.get(r.category)}
      busy={removePending}
      selected={picked.has(r.category)}
      onSelect={selecting ? on => pick(r.category, on) : undefined}
      onOpen={() => onOpenCategory(r.category)}
      onChange={amount => onChangeAmount(r, amount)}
      onRemove={() => onRemove(r)}
      onToggleRollover={() => onToggleRollover(r)}
    />
  )

  const query = search.trim().toLowerCase()
  // A goal has no over/watch/ok state, so a status filter hides goals; a search still applies to their names
  const goals = filter === 'all' ? goalRows.filter(r => !query || r.category.toLowerCase().includes(query)) : []
  const narrowed = filter !== 'all' || query !== ''
  const noMatch = spendCount > 0 && shownCount === 0

  return (
    <section className="card space-y-1 divide-y divide-line">
      <div className="flex flex-wrap items-center gap-2 pb-3">
        {many && !selecting && (
          <>
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
          </>
        )}
        {selecting && (
          <>
            <Checkbox
              checked={chosen.length > 0 && chosen.length === visible.length}
              onChange={on => setPicked(on ? new Set(visible.map(r => r.category)) : new Set())}
              ariaLabel="Select all"
            />
            <span className="text-sm text-midnight-300">{chosen.length} selected</span>
            <button
              className="btn-secondary !text-negative disabled:opacity-50"
              disabled={chosen.length === 0 || removePending}
              onClick={() => setConfirming(true)}
            >
              Remove
            </button>
          </>
        )}
        <button className="btn-secondary ml-auto" onClick={selecting ? stop : () => setSelecting(true)}>
          {selecting ? 'Done' : 'Select'}
        </button>
      </div>
      {!selecting && scheduledRows.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm text-midnight-400">
          <span>
            {scheduledRows.length} {scheduledRows.length === 1 ? 'budget is' : 'budgets are'} on recurring payments (
            {scheduledRows
              .slice(0, 3)
              .map(r => r.category)
              .join(', ')}
            {scheduledRows.length > 3 ? '…' : ''}), which already repeat on a schedule.
          </span>
          <button
            className="text-accent underline underline-offset-2 hover:text-ink"
            onClick={() => {
              setSelecting(true)
              setPicked(new Set(scheduledRows.map(r => r.category)))
            }}
          >
            Review
          </button>
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          title={`Remove ${chosen.length} ${chosen.length === 1 ? 'budget' : 'budgets'}?`}
          description="The limits are removed. Your transactions are not touched."
          confirmLabel="Remove"
          busy={removePending}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            void onRemoveMany(chosen)
              .then(stop)
              .catch(() => undefined)
              .finally(() => setConfirming(false))
          }
        />
      )}
      {noMatch && goals.length === 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-6 text-sm text-midnight-400">
          <span>No budgets match{narrowed ? ' these filters' : ''}.</span>
          {narrowed && (
            <button
              className="text-accent underline underline-offset-2 hover:text-ink"
              onClick={() => {
                onSearchChange('')
                onFilterChange('all')
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      {(!noMatch || goals.length > 0) && (
        <BudgetListHead labels={['Used', 'Spent', 'Limit', 'Left', 'Last 6 months']} />
      )}
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
      {goals.length > 0 && (
        <div className="!border-t-0 pt-4">
          <h2 className="pb-1 text-xs uppercase tracking-wide text-midnight-500">
            Put away <span className="normal-case">· a goal to reach, not counted as spent</span>
          </h2>
          <ul className="divide-y divide-line">{goals.map(card)}</ul>
        </div>
      )}
    </section>
  )
}
