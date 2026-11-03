import { formatCurrency } from '@/shared/utils/format'
import type { CategoryRow } from '@/shared/utils/analysis/analyze'

/** Who a category went to; split by subcategory first when some were chosen. The parent's total stays as it is. */
export default function CategoryBreakdownDrilldown({
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
