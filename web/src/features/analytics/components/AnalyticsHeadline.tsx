import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import type { Analysis } from '@/shared/utils/analysis/analyze'

/** What was spent and how it compares. Invested and saved are not here: "Where it went" lists them under what was put away. */
export default function AnalyticsHeadline({ a, currency }: { a: Analysis; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency)
  const delta =
    a.previousSpent !== null && a.previousSpent > 0 ? ((a.spent - a.previousSpent) / a.previousSpent) * 100 : null
  const fixedShare = a.spent > 0 ? (a.repeating / a.spent) * 100 : 0

  return (
    <div className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="shrink-0">
        <p className="text-sm font-medium text-midnight-400">Spent</p>
        <p className="figure">{money(a.spent)}</p>
        {delta !== null && (
          <p className={`text-xs ${delta > 0 ? 'text-warning' : 'text-positive'}`}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}% vs the period before ({money(a.previousSpent!)})
          </p>
        )}
      </div>
      {a.spent > 0 && (
        <div className="min-w-0 flex-1">
          <div
            className="flex h-2 gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={`${Math.round(fixedShare)}% fixed, ${Math.round(100 - fixedShare)}% not scheduled`}
          >
            <div className="bg-accent" style={{ width: `${fixedShare}%` }} />
            <div className="bg-midnight-600" style={{ width: `${100 - fixedShare}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-midnight-300">
            <Tooltip label="Rent, bills and the like, paid on a schedule">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                Fixed <span className="tabular-nums text-ink">{money(a.repeating)}</span>
                <span className="text-midnight-500">{Math.round(fixedShare)}%</span>
              </span>
            </Tooltip>
            <Tooltip label={`Groceries, going out, one-offs: about ${money(a.everydayPerDay)} a day`}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-midnight-600" aria-hidden />
                Not scheduled <span className="tabular-nums text-ink">{money(a.everyday)}</span>
              </span>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  )
}
