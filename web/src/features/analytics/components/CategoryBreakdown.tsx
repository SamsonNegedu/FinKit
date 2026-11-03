import CategoryIcon from '@/shared/components/CategoryIcon'
import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import type { CategoryRow, PutAwayRow } from '@/shared/utils/analysis/analyze'

/** Investments and savings, apart from the spending above: who they went to, not part of any share. */
function PutAwayList({
  rows,
  currency,
  onSelect,
  onSelectMerchant,
}: {
  rows: PutAwayRow[]
  currency: string
  onSelect: (category: string) => void
  onSelectMerchant: (merchant: string) => void
}) {
  return (
    <div className="mt-4 border-t border-midnight-800 pt-3">
      <h3 className="px-2 text-xs font-normal uppercase tracking-wide text-midnight-500">
        Put away, not counted as spent
      </h3>
      <ul className="mt-1">
        {rows.map(r => (
          <li key={r.category}>
            <button
              onClick={() => onSelect(r.category)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-midnight-800/70"
            >
              <CategoryIcon category={r.category} color={r.color} />
              <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-white">
                  {r.category === 'Investment' ? 'Invested' : 'Saved'}
                </span>
                <span className="whitespace-nowrap tabular-nums text-white">
                  {formatCurrency(r.total, currency)} <span className="text-xs text-midnight-500">{r.count}×</span>
                </span>
              </span>
            </button>
            <ul>
              {r.merchants.slice(0, 5).map(m => (
                <li key={m.merchant}>
                  <button
                    onClick={() => onSelectMerchant(m.merchant)}
                    className="flex w-full items-baseline justify-between gap-2 rounded-lg py-1 pl-14 pr-2 text-left text-sm text-midnight-300 hover:bg-midnight-800/70"
                  >
                    <span className="truncate">{m.merchant}</span>
                    <span className="whitespace-nowrap tabular-nums">{formatCurrency(m.total, currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Every category, biggest first, with its share and how it moved. Nothing is rolled up or hidden. */
export default function CategoryBreakdown({
  rows,
  putAway = [],
  currency,
  onSelect,
  onSelectMerchant,
}: {
  rows: CategoryRow[]
  /** Investments and savings, listed under the spending */
  putAway?: PutAwayRow[]
  currency: string
  onSelect: (category: string) => void
  onSelectMerchant: (merchant: string) => void
}) {
  if (rows.length === 0 && putAway.length === 0) {
    return (
      <section className="card">
        <h2 className="text-lg font-semibold text-white">Where it went</h2>
        <p className="mt-3 text-midnight-400">No spending in this period.</p>
      </section>
    )
  }
  const max = rows[0]?.total ?? 1

  return (
    <section className="card !p-4 sm:!p-6">
      <h2 className="text-lg font-semibold text-white">Where it went</h2>
      <div
        className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label="Share of each category"
      >
        {rows.map(r => (
          <div key={r.category} style={{ width: `${r.share}%`, backgroundColor: r.color }} />
        ))}
      </div>
      <ul className="mt-3">
        {rows.map(r => {
          const delta = r.previous !== null ? r.total - r.previous : null

          return (
            <li key={r.category}>
              <Tooltip label={`Show ${r.category} transactions`}>
                <button
                  onClick={() => onSelect(r.category)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-midnight-800/70"
                >
                  <CategoryIcon category={r.category} color={r.color} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-white">{r.category}</span>
                      <span className="whitespace-nowrap tabular-nums text-white">
                        {formatCurrency(r.total, currency)}
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-midnight-800" aria-hidden>
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.max(2, (r.total / max) * 100)}%`, backgroundColor: r.color }}
                      />
                    </span>
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs">
                    <span className="block tabular-nums text-midnight-300">
                      {Math.round(r.share)}% · {r.count}×
                    </span>
                    {delta !== null && Math.abs(delta) >= 1 && (
                      <span className={`block tabular-nums ${delta > 0 ? 'text-amber-300' : 'text-accent'}`}>
                        {delta > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(delta), currency)}
                      </span>
                    )}
                  </span>
                </button>
              </Tooltip>
            </li>
          )
        })}
      </ul>
      {putAway.length > 0 && (
        <PutAwayList rows={putAway} currency={currency} onSelect={onSelect} onSelectMerchant={onSelectMerchant} />
      )}
    </section>
  )
}
