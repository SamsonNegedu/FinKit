import { formatCurrency } from '@/shared/utils/format'
import { WATCH_AT, type BudgetTotals } from '../utils/budgetProgress'
import BudgetBar from './BudgetBar'

/**
 * The month at a glance: what is left to spend, as a bar with where today falls, and how the month before went. There
 * is no "per day" figure on purpose: much of a budget is rent and bills, which are not spent a little each day. The month itself is named by the switcher above, so it is not repeated here.
 */
export default function BudgetSummary({
  totals,
  currency,
  paceAt,
  previous,
  onSetCap,
}: {
  totals: BudgetTotals
  currency: string
  /** How far through the month today is (0-1); null for a month that is over */
  paceAt: number | null
  /** How the month before went, for context, e.g. "October: €1,203 of €1,520 · 1 over" */
  previous: string | null
  /** Offered while there is no overall cap */
  onSetCap?: () => void
}) {
  const over = totals.left < 0
  const used = totals.budgeted > 0 ? totals.spent / totals.budgeted : 0
  const state = over ? 'over' : used >= WATCH_AT ? 'watch' : 'ok'
  const note =
    totals.over + totals.watch === 0
      ? 'Everything on track'
      : [totals.over && `${totals.over} over`, totals.watch && `${totals.watch} close to the limit`]
          .filter(Boolean)
          .join(' · ')

  return (
    <section className="card space-y-3" aria-label="Month summary">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className={`text-2xl font-bold tabular-nums ${over ? 'text-rose-400' : 'text-white'}`}>
            {formatCurrency(Math.abs(totals.left), currency)} {over ? 'over' : 'left'}
            <span className="ml-2 text-sm font-normal text-midnight-400">
              of {formatCurrency(totals.budgeted, currency)} budgeted
            </span>
          </p>
        </div>
        <p className={`pb-1 text-sm ${totals.over ? 'text-rose-400' : 'text-midnight-300'}`}>{note}</p>
      </div>
      <BudgetBar
        used={used}
        state={state}
        paceAt={paceAt}
        label="Budgeted spending used this month"
        thick
        paceLabel="Today"
        overLabel={`+${formatCurrency(-totals.left, currency)}`}
        limitLabel={`Budgeted ${formatCurrency(totals.budgeted, currency)}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-midnight-400">
        <span className="tabular-nums">
          {formatCurrency(totals.spent, currency)} spent{previous ? ` · ${previous}` : ''}
        </span>
        {onSetCap && (
          <button className="hover:text-white hover:underline" onClick={onSetCap}>
            Set an overall cap
          </button>
        )}
      </div>
    </section>
  )
}
