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

/** The four numbers to know first: spent (with how it compares), set aside, per day, and how much repeats. */
export default function AnalyticsHeadline({ a, currency }: { a: Analysis; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency)
  const delta =
    a.previousSpent !== null && a.previousSpent > 0 ? ((a.spent - a.previousSpent) / a.previousSpent) * 100 : null

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      <Tile label="Set aside" value={money(a.setAside)} note="Savings and investments, not counted as spent" />
      <Tile label="Per day" value={money(a.avgDaily)} note="Average spent each day" />
      <Tile
        label="Repeats"
        value={a.spent > 0 ? `${Math.round((a.repeating / a.spent) * 100)}%` : '0%'}
        note={`${money(a.repeating)} paid on a schedule`}
      />
    </div>
  )
}
