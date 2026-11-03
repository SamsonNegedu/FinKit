import { formatCurrency } from '@/shared/utils/format'
import type { ContractTotals } from '../api/contracts.api'
import { getCategoryColor } from '@/shared/utils/categorizer/categoryMeta'

/** The monthly bill for everything still running, drawn as one bar split by group. */
export default function ContractsSummary({
  totals,
  unconverted = [],
}: {
  totals: ContractTotals
  /** Totals in currencies with no rate yet, shown beside the main one instead of being guessed at */
  unconverted?: ContractTotals[]
}) {
  const parts = Object.entries(totals.byGroup).sort((a, b) => b[1] - a[1])

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="text-sm font-medium text-midnight-400">Fixed costs per month</p>
          <p className="figure">{formatCurrency(totals.monthly, totals.currency)}</p>
        </div>
        <p className="pb-1 text-xs text-midnight-400">
          {formatCurrency(totals.monthly * 12, totals.currency)} a year ·{' '}
          <span className="text-midnight-300">{formatCurrency(totals.variable, totals.currency)} of it varies</span>
        </p>
      </div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Share of each group">
        {parts.map(([group, amount]) => (
          <div
            key={group}
            style={{
              width: `${(amount / totals.monthly) * 100}%`,
              backgroundColor: getCategoryColor(group),
            }}
          />
        ))}
      </div>
      {unconverted.length > 0 && (
        <p className="text-xs text-midnight-400">
          Not included: {unconverted.map(u => `${formatCurrency(u.monthly, u.currency)} a month`).join(', ')} (add a
          rate in Settings to count {unconverted.length === 1 ? 'it' : 'them'}).
        </p>
      )}
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {parts.map(([group, amount]) => (
          <li key={group} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getCategoryColor(group) }} aria-hidden />
            <span className="text-midnight-300">{group}</span>
            <span className="text-ink tabular-nums">{formatCurrency(amount, totals.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
