import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Checkbox from '@/shared/components/forms/Checkbox'
import Tooltip from '@/shared/components/Tooltip'
import { formatCurrency, formatWhole } from '@/shared/utils/format'
import type { SheetColumn } from '@/shared/types'
import { monthTsv, yearGrid, type MonthGroup, type YearColumn } from '@/shared/utils/analysis/sheetYear'
import { getCategoryColor } from '@/shared/utils/categorizer'
import { categoryFromHeader } from '@/shared/utils/sheetLayout'

/** A category column takes the category's own color; the sheet's totals have fixed ones, as in Export */
const TOTAL_COLORS: Record<string, string> = {
  total: '#ef4444',
  income: '#10b981',
  incomeAfter: '#10b981',
  savings: '#3b82f6',
  investment: '#06b6d4',
  net: '#10b981',
}
const NEGATIVE = '#ef4444'
const colorOf = (c: YearColumn) =>
  c.kind === 'category' ? getCategoryColor(categoryFromHeader(c.label)) : (TOTAL_COLORS[c.kind] ?? '#94a3b8')
const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`

const cell = (n: number) => (Math.abs(n) < 0.5 ? <span className="text-midnight-600">–</span> : formatWhole(n))
const monthName = (m: MonthGroup) => new Date(m.year, m.month, 1).toLocaleDateString('en-US', { month: 'long' })

/**
 * One row per month, one column per column of the export sheet, in the sheet's order. A column never gets narrower
 * than its header, so a sheet with more columns scrolls sideways instead of squeezing or wrapping them.
 *
 * Kept quiet on purpose: the color lives in the header, the numbers are plain, and only a column's biggest month and
 * a negative result are marked. "Shade by size" brings back a fade per cell for those who want it. The sheet's
 * totals sit after a gap and a little stronger, since they are what the categories add up to.
 */
export default function YearTable({
  months,
  year,
  layout,
  currency,
}: {
  months: MonthGroup[]
  year: number
  layout: SheetColumn[]
  currency: string
}) {
  const [shade, setShade] = useState(false)
  const [hoverColumn, setHoverColumn] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const copyMonth = async (m: MonthGroup) => {
    try {
      await navigator.clipboard.writeText(monthTsv(m, layout))
      setCopied(m.key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }
  const grid = yearGrid(months, layout)
  const shown = grid.columns
    .map((c, j) => ({ c, j }))
    .filter(({ c, j }) => c.kind !== 'category' || Math.abs(grid.totals[j]) >= 0.5)
  const hidden = grid.columns.length - shown.length
  const peaks = grid.columns.map((_, j) => Math.max(...grid.rows.map(r => r.values[j]), 0))
  // A biggest month is worth marking only when it stands out: one month clearly above the rest, not a flat column
  const standsOut = grid.columns.map((_, j) => {
    const values = grid.rows.map(r => r.values[j]).filter(v => v > 0.5)
    const others = values.filter(v => v !== peaks[j])

    return (
      values.length - others.length === 1 &&
      others.length >= 3 &&
      peaks[j] >= 1.3 * (others.reduce((a, b) => a + b, 0) / others.length)
    )
  })
  const firstTotal = shown.findIndex(({ c }) => c.kind !== 'category')

  const columnClass = (index: number, isTotal: boolean) =>
    `${index === firstTotal ? 'border-l border-midnight-600' : ''} ${isTotal ? 'bg-midnight-900/70' : ''} ${
      hoverColumn === index ? 'bg-white/[0.04]' : ''
    }`

  return (
    <div>
      <label className="mb-3 flex items-center justify-end gap-2 text-sm text-midnight-300">
        <Checkbox checked={shade} onChange={setShade} ariaLabel="Shade cells by size" />
        Shade by size
      </label>
      <div className="overflow-x-auto">
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- only clears the column highlight; nothing is lost without a mouse */}
        <table className="w-max min-w-full text-sm" onMouseLeave={() => setHoverColumn(null)}>
          <thead>
            <tr className="align-bottom text-xs">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-midnight-950 py-2 pr-4 text-left font-normal text-midnight-400"
              >
                {year}
              </th>
              {shown.map(({ c }, i) => (
                <th
                  key={c.column}
                  scope="col"
                  onMouseEnter={() => setHoverColumn(i)}
                  className={`min-w-[5.5rem] whitespace-nowrap px-3 py-2 text-right font-medium text-midnight-100 ${columnClass(i, c.kind !== 'category')}`}
                  style={{ borderBottom: `3px solid ${colorOf(c)}` }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map(r => (
              <tr key={r.month.key} className="group border-t border-midnight-800 hover:bg-white/[0.03]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-midnight-950 py-2 pr-4 text-left font-normal text-white"
                >
                  <span className="flex items-center gap-1">
                    {monthName(r.month)}
                    <Tooltip label={`Copy ${monthName(r.month)} as a row for your sheet`}>
                      <button
                        onClick={() => copyMonth(r.month)}
                        aria-label={`Copy ${monthName(r.month)} as a sheet row`}
                        className="rounded p-1 text-midnight-500 hover:bg-midnight-800 hover:text-white focus:text-white focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        {copied === r.month.key ? (
                          <Check className="h-3.5 w-3.5 text-accent" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </Tooltip>
                  </span>
                </th>
                {shown.map(({ c, j }, i) => {
                  const n = r.values[j]
                  const isTotal = c.kind !== 'category'
                  const negative = n < -0.5 && (c.kind === 'incomeAfter' || c.kind === 'net')
                  const biggest = !isTotal && standsOut[j] && n === peaks[j]
                  let background: string | undefined

                  if (negative) {
                    background = tint(NEGATIVE, 18)
                  } else if (shade && !isTotal && n > 0.5) {
                    background = tint(colorOf(c), Math.round((n / (peaks[j] || 1)) * 22))
                  } else if (biggest) {
                    background = tint(colorOf(c), 20)
                  }

                  return (
                    <td
                      key={c.column}
                      onMouseEnter={() => setHoverColumn(i)}
                      className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${negative ? 'text-expense' : isTotal ? 'font-medium text-white' : 'text-midnight-100'} ${columnClass(i, isTotal)}`}
                      style={{ backgroundColor: background }}
                    >
                      {cell(n)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-midnight-600 font-medium">
              <th scope="row" className="sticky left-0 z-10 bg-midnight-950 py-2 pr-4 text-left text-white">
                Year
              </th>
              {shown.map(({ c, j }, i) => (
                <td
                  key={c.column}
                  onMouseEnter={() => setHoverColumn(i)}
                  className={`whitespace-nowrap px-3 py-2 text-right tabular-nums text-white ${columnClass(i, c.kind !== 'category')}`}
                >
                  {cell(grid.totals[j])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-4 text-xs text-midnight-400">
        Amounts in {currency}, rounded. A tinted cell is a month well above the rest of its column.
        {hidden > 0 &&
          ` ${hidden} ${hidden === 1 ? 'category' : 'categories'} with nothing this year ${hidden === 1 ? 'is' : 'are'} left out.`}
        {grid.unmapped.length > 0 &&
          ` Not in the totals, because your sheet has no column for them: ${grid.unmapped
            .map(u => `${u.category} ${formatCurrency(u.total, currency)}`)
            .join(' · ')}.`}
      </p>
    </div>
  )
}
