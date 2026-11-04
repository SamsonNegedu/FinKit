import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import CategoryIcon from '@/shared/components/CategoryIcon'
import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import type { CategoryRow, PutAwayRow } from '@/shared/utils/analysis/analyze'
import CategoryBreakdownDrilldown from './CategoryBreakdownDrilldown'
import CategoryBreakdownPutAway from './CategoryBreakdownPutAway'

/** Every category, biggest first, with its share and how it moved. Nothing is rolled up or hidden. */
export default function CategoryBreakdown({
  rows,
  putAway = [],
  currency,
  onSelect,
  onSelectMerchant,
}: {
  rows: CategoryRow[]
  putAway?: PutAwayRow[]
  currency: string
  onSelect: (category: string) => void
  onSelectMerchant: (merchant: string) => void
}) {
  const [open, setOpen] = useState<string | null>(null)

  if (rows.length === 0 && putAway.length === 0) {
    return (
      <section className="card">
        <h2 className="text-lg font-semibold text-ink">Where it went</h2>
        <p className="mt-3 text-midnight-400">No spending in this period.</p>
      </section>
    )
  }
  const max = rows[0]?.total ?? 1

  return (
    <section className="card flex flex-col !p-4 sm:!p-6 lg:h-full lg:min-h-0">
      <h2 className="text-lg font-semibold text-ink">Where it went</h2>
      <div
        className="mt-3 flex h-2.5 shrink-0 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label="Share of each category"
      >
        {rows.map(r => (
          <div key={r.category} style={{ width: `${r.share}%`, backgroundColor: r.color }} />
        ))}
      </div>
      <ul className="mt-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {rows.map(r => {
          const delta = r.previous !== null ? r.total - r.previous : null

          return (
            <li key={r.category}>
              <div className="flex items-center">
                <Tooltip label={`Show ${r.category} transactions`}>
                  <button
                    onClick={() => onSelect(r.category)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-left hover:bg-accent/10"
                  >
                    <CategoryIcon category={r.category} color={r.color} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-ink">{r.category}</span>
                        <span className="whitespace-nowrap tabular-nums text-ink">
                          {formatCurrency(r.total, currency)}
                        </span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-midnight-800" aria-hidden>
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(2, (r.total / max) * 100)}%`,
                            backgroundColor: r.color,
                          }}
                        />
                      </span>
                      {/* On a phone the share and change sit under the bar, so the name and amount keep the width */}
                      <span className="mt-1 flex justify-between gap-2 text-xs tabular-nums text-midnight-300 sm:hidden">
                        <span>
                          {Math.round(r.share)}% · {r.count}×
                        </span>
                        {delta !== null && Math.abs(delta) >= 1 && (
                          <span className={delta > 0 ? 'text-warning' : 'text-accent'}>
                            {delta > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(delta), currency)}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="hidden w-52 shrink-0 flex-row items-baseline justify-end gap-3 text-right text-xs sm:flex">
                      <span className="tabular-nums text-midnight-300">
                        {Math.round(r.share)}% · {r.count}×
                      </span>
                      {delta !== null && Math.abs(delta) >= 1 && (
                        <span className={`tabular-nums sm:w-24 ${delta > 0 ? 'text-warning' : 'text-accent'}`}>
                          {delta > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(delta), currency)}
                        </span>
                      )}
                    </span>
                  </button>
                </Tooltip>
                <Tooltip label={open === r.category ? 'Hide the breakdown' : `Where ${r.category} went`}>
                  <button
                    onClick={() => setOpen(open === r.category ? null : r.category)}
                    aria-expanded={open === r.category}
                    aria-label={`Where ${r.category} went`}
                    className="ml-1 rounded-lg p-2 text-midnight-400 hover:bg-accent/10 hover:text-ink"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${open === r.category ? 'rotate-180' : ''}`}
                    />
                  </button>
                </Tooltip>
              </div>
              {open === r.category && (
                <CategoryBreakdownDrilldown row={r} currency={currency} onSelectMerchant={onSelectMerchant} />
              )}
            </li>
          )
        })}
      </ul>
      {putAway.length > 0 && (
        <CategoryBreakdownPutAway
          rows={putAway}
          currency={currency}
          onSelect={onSelect}
          onSelectMerchant={onSelectMerchant}
        />
      )}
    </section>
  )
}
