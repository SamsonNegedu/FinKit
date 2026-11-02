import { Pencil, X } from 'lucide-react'
import { formatCurrency } from '@/shared/utils/format'
import type { CapSummary } from '../utils/budgetProgress'
import BudgetBar from './BudgetBar'

/** The overall cap: everything spent in the month, budgeted or not, against one number. */
export default function BudgetCapCard({
  cap,
  currency,
  paceAt,
  onEdit,
  onRemove,
}: {
  cap: CapSummary
  currency: string
  paceAt: number | null
  onEdit: () => void
  onRemove: () => void
}) {
  const over = cap.left < 0

  return (
    <section className="card space-y-2 py-3" aria-label="Monthly cap">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-midnight-300">Monthly cap on all spending</h2>
        <span className="flex items-center">
          <button
            className="p-1.5 text-midnight-400 hover:text-white"
            aria-label="Edit the monthly cap"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 text-midnight-400 hover:text-white"
            aria-label="Remove the monthly cap"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </button>
        </span>
      </div>
      <BudgetBar used={cap.used} state={cap.state} paceAt={paceAt} label="Monthly cap used" />
      <div className="flex flex-wrap justify-between gap-x-4 text-sm tabular-nums">
        <span className="text-midnight-300">
          {formatCurrency(cap.spent, currency)} of {formatCurrency(cap.cap, currency)} ({Math.round(cap.used * 100)}%)
        </span>
        <span className={over ? 'text-rose-400' : 'text-midnight-300'}>
          {over ? `${formatCurrency(-cap.left, currency)} over` : `${formatCurrency(cap.left, currency)} left`}
        </span>
      </div>
    </section>
  )
}
