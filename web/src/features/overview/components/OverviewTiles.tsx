import { formatCurrency } from '@/shared/utils/format'
import type { Analysis } from '@/shared/utils/analysis/analyze'

function Tile({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note?: string
  tone?: 'up' | 'down' | 'bad'
}) {
  const color = tone === 'up' ? 'text-warning' : tone === 'down' ? 'text-positive' : 'text-ink-faint'

  return (
    <div className="card-raised !p-4">
      <p className="text-sm font-medium text-ink-faint">{label}</p>
      <p className={`figure mt-1 ${tone === 'bad' ? 'text-negative' : ''}`}>{value}</p>
      {note && <p className={`mt-1 text-xs ${color}`}>{note}</p>}
    </div>
  )
}

/** The month in four numbers: what came in, what went out, what was put aside, and what is left over. */
export default function OverviewTiles({ a, currency }: { a: Analysis; currency: string }) {
  const money = (n: number) => formatCurrency(n, currency)
  const left = a.income - a.spent - a.setAside
  const delta =
    a.previousSpent !== null && a.previousSpent > 0 ? ((a.spent - a.previousSpent) / a.previousSpent) * 100 : null

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile label="Income" value={money(a.income)} />
      <Tile
        label="Spent"
        value={money(a.spent)}
        note={
          delta === null ? undefined : `${delta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(delta))}% vs the period before`
        }
        tone={delta === null ? undefined : delta > 0 ? 'up' : 'down'}
      />
      <Tile label="Set aside" value={money(a.setAside)} note="Savings and investments" />
      <Tile
        label="Left over"
        value={money(left)}
        note="Income minus spent and set aside"
        tone={left < 0 ? 'bad' : undefined}
      />
    </div>
  )
}
