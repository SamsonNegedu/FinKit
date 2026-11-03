import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency } from '@/shared/utils/format'
import type { MerchantRow } from '@/shared/utils/analysis/analyze'

/** Who the money went to, however they were spelled, biggest first. Scrolls inside the card so it can match the category card's height. */
export default function MerchantList({
  rows,
  currency,
  onSelect,
}: {
  rows: MerchantRow[]
  currency: string
  onSelect: (merchant: string) => void
}) {
  const max = rows[0]?.total ?? 1

  return (
    <section className="card flex flex-col !p-4 sm:!p-6 lg:h-full lg:min-h-0">
      <h2 className="text-lg font-semibold text-ink">Top merchants</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-midnight-400">No spending in this period.</p>
      ) : (
        <ul className="mt-3 max-h-[460px] overflow-y-auto pr-1 lg:max-h-none lg:min-h-0 lg:flex-1">
          {rows.map((m, i) => (
            <li key={m.merchant}>
              <Tooltip label={`Show ${m.merchant} transactions`}>
                <button
                  aria-label={`Show ${m.merchant} transactions`}
                  onClick={() => onSelect(m.merchant)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent/10"
                >
                  <span className="w-5 shrink-0 text-xs tabular-nums text-midnight-500">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-ink">{m.merchant}</span>
                      <span className="whitespace-nowrap tabular-nums text-ink">
                        {formatCurrency(m.total, currency)}{' '}
                        <span className="text-xs text-midnight-500">{m.count}×</span>
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-midnight-800" aria-hidden>
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(2, (m.total / max) * 100)}%` }}
                      />
                    </span>
                  </span>
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
