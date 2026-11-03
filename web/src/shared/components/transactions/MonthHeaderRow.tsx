import { formatCurrency } from '@/shared/utils/format'

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

/** A divider between months in a date-sorted list: the month, how many rows it holds, and their net. */
export default function MonthHeaderRow({
  month,
  count,
  net,
  currency,
}: {
  month: string
  count: number
  net: number
  currency: string
}) {
  const label = monthName.format(new Date(`${month}-01T12:00:00`))

  return (
    <tr className="max-md:block">
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a heading cell, not a control */}
      <th
        colSpan={5}
        scope="colgroup"
        className="pt-6 pb-2 px-4 text-left font-normal max-md:block max-md:px-3 max-md:pt-4"
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-ink">{label}</span>
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-midnight-400">{count === 1 ? '1 transaction' : `${count} transactions`}</span>
          <span className="text-sm text-midnight-300 tabular-nums">
            <span className="mr-1.5 text-xs text-midnight-500">Net</span>
            {net < 0 ? '-' : ''}
            {formatCurrency(Math.abs(net), currency)}
          </span>
        </div>
      </th>
    </tr>
  )
}
