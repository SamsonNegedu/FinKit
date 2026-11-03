import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import CategoryIcon from '@/shared/components/CategoryIcon'
import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import type { PutAwayRow } from '@/shared/utils/analysis/analyze'

/** Investments and savings, apart from the spending above: who they went to, not part of any share. */
export default function CategoryBreakdownPutAway({
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
