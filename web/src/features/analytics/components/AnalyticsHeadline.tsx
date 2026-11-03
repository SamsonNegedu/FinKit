import { formatCurrency } from '@/shared/utils/format'
import type { Analysis } from '@/shared/utils/analysis/analyze'

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'up' | 'down' }) {
  return (
    <div className="card !p-4">
      <p className="text-sm font-medium text-midnight-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white tabular-nums">{value}</p>
      {note && (
        <p
          className={`mt-1 text-xs ${tone === 'up' ? 'text-amber-300' : tone === 'down' ? 'text-accent' : 'text-midnight-400'}`}
        >
          {note}
        </p>
      )}
    </div>
  )
}

/** The numbers to know first: spent (with how it compares), what is fixed, what is not scheduled, invested and saved. */
export default function AnalyticsHeadline({ a, currency }: { a: Analysis; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency)
  const delta =
    a.previousSpent !== null && a.previousSpent > 0 ? ((a.spent - a.previousSpent) / a.previousSpent) * 100 : null

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile
        label="Spent"
        value={money(a.spent)}
        note={
          delta === null
            ? undefined
            : `${delta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta))}% vs the period before (${money(a.previousSpent!)})`
        }
        tone={delta === null ? undefined : delta > 0 ? 'up' : 'down'}
      />
      <Tile
        label="Fixed"
        value={money(a.repeating)}
        note={`${a.spent > 0 ? Math.round((a.repeating / a.spent) * 100) : 0}% of spent: rent, bills and the like, paid on a schedule`}
      />
      <Tile
        label="Not scheduled"
        value={money(a.everyday)}
        note={`Groceries, going out, one-offs: about ${money(a.everydayPerDay)} a day`}
      />
      <Tile label="Invested" value={money(a.invested)} note="Put away for good, not counted as spent" />
      <Tile label="Saved" value={money(a.saved)} note="Not counted as spent, still yours to move" />
    </div>
  )
}
