import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import type { HistoryMonth } from '../utils/budgetProgress'

const DOT: Record<NonNullable<HistoryMonth['state']>, string> = {
  ok: 'bg-positive',
  watch: 'bg-warning',
  over: 'bg-negative',
  met: 'bg-cyan-500',
  short: 'bg-cyan-500/30',
}

function dotLabel(m: HistoryMonth, currency: string, goal: boolean): string {
  if (m.state === null) {
    return m.ongoing
      ? `${m.label}: ${formatCurrency(m.spent, currency)} of ${formatCurrency(m.limit, currency)} so far`
      : `${m.label}: nothing to compare`
  }
  const figures = `${formatCurrency(m.spent, currency)} of ${formatCurrency(m.limit, currency)}`
  const verdict = {
    ok: 'within the limit',
    watch: 'close to the limit',
    over: 'over the limit',
    met: 'goal reached',
    short: 'goal not reached',
  }[m.state]

  return `${m.label}: ${figures}, ${goal && m.state === 'short' ? 'goal not reached' : verdict}`
}

/** The last few months at a glance: which budgets keep going over. Hidden on a phone, where there is no room. */
export default function BudgetHistoryDots({
  months,
  currency,
  goal,
}: {
  months: HistoryMonth[]
  currency: string
  goal: boolean
}) {
  const bad = months.filter(m => m.state === 'over').length
  const summary = goal
    ? `${months.filter(m => m.state === 'met').length} of the last ${months.length} months reached`
    : `${bad} of the last ${months.length} months over`

  return (
    <span
      className="hidden items-center justify-end gap-1 sm:col-start-6 sm:row-start-1 sm:flex"
      role="img"
      aria-label={summary}
    >
      {months.map(m => (
        <Tooltip key={m.label} label={dotLabel(m, currency, goal)}>
          <span
            className={`h-2.5 w-2.5 rounded-full ${m.state ? DOT[m.state] : 'border border-line-strong'}`}
            aria-hidden="true"
          />
        </Tooltip>
      ))}
    </span>
  )
}
