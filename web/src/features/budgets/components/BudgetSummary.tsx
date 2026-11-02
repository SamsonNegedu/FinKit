import { formatCurrency } from '@/shared/utils/format'
import type { BudgetTotals } from '../utils/budgetProgress'

/** The month at a glance: what is budgeted, what is gone, and how many categories need attention. */
export default function BudgetSummary({
  totals,
  currency,
  monthLabel,
}: {
  totals: BudgetTotals
  currency: string
  monthLabel: string
}) {
  const over = totals.left < 0
  const note =
    totals.over + totals.watch === 0
      ? 'Everything on track'
      : [totals.over && `${totals.over} over`, totals.watch && `${totals.watch} close to the limit`]
          .filter(Boolean)
          .join(' · ')

  return (
    <section className="card flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <p className="text-sm font-medium text-midnight-400">{monthLabel}</p>
        <p className={`text-2xl font-bold tabular-nums ${over ? 'text-rose-400' : 'text-white'}`}>
          {formatCurrency(Math.abs(totals.left), currency)} {over ? 'over' : 'left'}
        </p>
      </div>
      <p className="pb-1 text-sm text-midnight-300 tabular-nums">
        {formatCurrency(totals.spent, currency)} of {formatCurrency(totals.budgeted, currency)} budgeted ·{' '}
        <span className={totals.over ? 'text-rose-400' : 'text-midnight-400'}>{note}</span>
      </p>
    </section>
  )
}
