import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  const [open, setOpen] = useState<string | null>(null)
  const max = Math.max(...rows.map(r => r.total), 1)

  return (
    <div className="mt-4 shrink-0 border-t border-line pt-3">
      <h3 className="px-2 text-xs font-normal uppercase tracking-wide text-midnight-500">
        Put away, not counted as spent
      </h3>
      <ul className="mt-1">
        {rows.map(r => (
          <li key={r.category}>
            <div className="flex items-center">
              <Tooltip label={`Show ${r.category} transactions`}>
                <button
                  onClick={() => onSelect(r.category)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent/10"
                >
                  <CategoryIcon category={r.category} color={r.color} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-ink">
                        {r.category === 'Investment' ? 'Invested' : 'Saved'}
                      </span>
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
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-midnight-300">{r.count}×</span>
                </button>
              </Tooltip>
              <Tooltip label={open === r.category ? 'Hide the breakdown' : `Where ${r.category} went`}>
                <button
                  onClick={() => setOpen(open === r.category ? null : r.category)}
                  aria-expanded={open === r.category}
                  aria-label={`Where ${r.category} went`}
                  className="ml-1 rounded-lg p-2 text-midnight-400 hover:bg-accent/10 hover:text-ink"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${open === r.category ? 'rotate-180' : ''}`} />
                </button>
              </Tooltip>
            </div>
            {open === r.category && (
              <ul>
                {r.merchants.slice(0, 5).map(m => (
                  <li key={m.merchant}>
                    <button
                      onClick={() => onSelectMerchant(m.merchant)}
                      className="flex w-full items-baseline justify-between gap-2 rounded-lg py-1 pl-14 pr-2 text-left text-sm text-midnight-300 hover:bg-accent/10"
                    >
                      <span className="truncate">{m.merchant}</span>
                      <span className="whitespace-nowrap tabular-nums">{formatCurrency(m.total, currency)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Who a category went to; split by subcategory first when some were chosen. The parent's total stays as it is. */
function CategoryDrilldown({
  row,
  currency,
  onSelectMerchant,
}: {
  row: CategoryRow
  currency: string
  onSelectMerchant: (merchant: string) => void
}) {
  const merchantList = (merchants: CategoryRow['merchants'], indent: string) => (
    <ul>
      {merchants.slice(0, 5).map(m => (
        <li key={m.merchant}>
          <button
            onClick={() => onSelectMerchant(m.merchant)}
            className={`flex w-full items-baseline justify-between gap-2 rounded-lg py-1 pr-2 text-left text-sm text-midnight-300 hover:bg-accent/10 ${indent}`}
          >
            <span className="truncate">{m.merchant}</span>
            <span className="whitespace-nowrap tabular-nums">{formatCurrency(m.total, currency)}</span>
          </button>
        </li>
      ))}
    </ul>
  )

  if (row.details.length === 0) {
    return merchantList(row.merchants, 'pl-14')
  }

  return (
    <ul>
      {row.details.map(d => (
        <li key={d.detail ?? 'none'}>
          <p className="flex items-baseline justify-between gap-2 py-1 pl-14 pr-2 text-sm text-ink">
            <span className="truncate">{d.detail ?? 'No subcategory yet'}</span>
            <span className="whitespace-nowrap tabular-nums">
              {formatCurrency(d.total, currency)}{' '}
              <span className="text-xs text-midnight-500">
                {Math.round((d.total / row.total) * 100)}% · {d.count}×
              </span>
            </span>
          </p>
          {merchantList(d.merchants, 'pl-20')}
        </li>
      ))}
    </ul>
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
                    </span>
                    <span className="flex w-24 shrink-0 flex-col text-right text-xs sm:w-52 sm:flex-row sm:items-baseline sm:justify-end sm:gap-3">
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
                <CategoryDrilldown row={r} currency={currency} onSelectMerchant={onSelectMerchant} />
              )}
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
