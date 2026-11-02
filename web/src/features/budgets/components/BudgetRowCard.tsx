import { useState } from 'react'
import { Pencil, Repeat, Trash2 } from 'lucide-react'
import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import CategoryIcon from '@/shared/components/CategoryIcon'
import type { BudgetRow } from '../utils/budgetProgress'
import BudgetBar from './BudgetBar'

// Icons stay visible on touch screens, where there is no hover to reveal them
const REVEAL =
  'p-1.5 text-midnight-400 hover:text-white sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100'

/** One budget on one line (two on a phone). The limit edits in place; the name opens that category's transactions. */
export default function BudgetRowCard({
  row,
  busy,
  onOpen,
  onChange,
  onRemove,
  onToggleRollover,
}: {
  row: BudgetRow
  busy: boolean
  onOpen: () => void
  onChange: (amount: number) => void
  onRemove: () => void
  onToggleRollover: () => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    const n = Number((draft ?? '').replace(',', '.'))

    if (n > 0 && n !== row.base) {
      onChange(n)
    }
    setDraft(null)
  }

  return (
    <li className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 text-sm sm:grid-cols-[11rem_minmax(5rem,1fr)_3rem_12rem_7rem_6.5rem]">
      <button
        className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 font-medium text-white hover:underline"
        onClick={onOpen}
      >
        <CategoryIcon category={row.category} size="sm" />
        <span className="truncate">{row.category}</span>
      </button>
      <div className="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <BudgetBar used={row.used} state={row.state} paceAt={row.paceAt} label={`${row.category} budget used`} />
      </div>
      <span className="hidden text-right tabular-nums text-midnight-300 sm:col-start-3 sm:row-start-1 sm:block">
        {Math.round(row.used * 100)}%
      </span>
      <span className="col-start-1 row-start-3 flex items-center gap-1.5 whitespace-nowrap tabular-nums text-midnight-300 sm:col-start-4 sm:row-start-1 sm:justify-end">
        <span>{formatCurrency(row.spent, row.currency)}</span>
        <span aria-hidden="true">/</span>
        {draft === null ? (
          formatCurrency(row.amount, row.currency)
        ) : (
          <input
            autoFocus
            className="input w-24 py-0.5 text-sm"
            inputMode="decimal"
            aria-label={`${row.category} limit`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                commit()
              } else if (e.key === 'Escape') {
                setDraft(null)
              }
            }}
          />
        )}
        <span className="text-midnight-400 sm:hidden">({Math.round(row.used * 100)}%)</span>
      </span>
      <span
        className={`col-start-2 row-start-3 text-right tabular-nums sm:col-start-5 sm:row-start-1 ${row.state === 'over' ? 'text-rose-400' : 'text-midnight-300'}`}
      >
        {row.left >= 0
          ? `${formatCurrency(row.left, row.currency)} left`
          : `${formatCurrency(-row.left, row.currency)} over`}
      </span>
      <span className="col-start-2 row-start-1 flex justify-end sm:col-start-6">
        <Tooltip
          label={
            row.rollover
              ? 'Unspent money carries into the next month. Click to stop.'
              : 'Carry unspent money into the next month'
          }
        >
          <button
            className={`${REVEAL} ${row.rollover ? 'sm:!opacity-100 !text-accent' : ''}`}
            aria-label={`Carry over unspent ${row.category} money`}
            aria-pressed={!!row.rollover}
            onClick={onToggleRollover}
          >
            <Repeat className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
        <button
          className={REVEAL}
          aria-label={`Edit the ${row.category} limit`}
          onClick={() => setDraft(String(row.base))}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button className={REVEAL} aria-label={`Remove the ${row.category} budget`} disabled={busy} onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </span>
      {row.carried > 0 && (
        <p className="col-span-full row-start-4 text-xs text-midnight-400 sm:col-start-1 sm:row-start-2">
          Includes {formatCurrency(row.carried, row.currency)} carried over from earlier months.
        </p>
      )}
      {row.projected !== null && row.projected > row.amount && row.state !== 'over' && (
        <p className="col-span-full row-start-4 text-xs text-amber-400 sm:col-start-1 sm:row-start-2">
          At this pace you'll reach about {formatCurrency(row.projected, row.currency)} by month end.
        </p>
      )}
    </li>
  )
}
