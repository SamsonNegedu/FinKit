import { useEffect, useState } from 'react'
import { formatCurrency } from '@/shared/utils/format'
import type { CategoryMonths, MonthKey } from '@/shared/utils/analysis/categoryMonths'

const label = (m: MonthKey) => new Date(m.year, m.month, 1).toLocaleDateString('en-US', { month: 'short' })

/** What one focused category did over the months shown: its average, and where it peaked and dipped. */
function FocusSummary({
  row,
  months,
  thisMonth,
  money,
  onClear,
}: {
  row: CategoryMonths['rows'][number]
  months: MonthKey[]
  /** year * 12 + month of today: a month not over yet is only part of a month, so it is left out of the figures */
  thisMonth: number
  money: (n: number) => string
  onClear: () => void
}) {
  const all = months.map((_, i) => i)
  const done = all.filter(i => months[i].year * 12 + months[i].month < thisMonth)
  const used = done.length > 0 ? done : all
  const values = used.map(i => row.cells[i])
  const average = values.reduce((sum, n) => sum + n, 0) / values.length
  const high = used[values.indexOf(Math.max(...values))]
  const low = used[values.indexOf(Math.min(...values))]

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-midnight-800 px-3 py-2 text-sm">
      <p className="text-midnight-200">
        <span className="font-medium text-white">{row.category}</span>: about {money(average)} a month, highest in{' '}
        {label(months[high])} ({money(row.cells[high])}), lowest in {label(months[low])} ({money(row.cells[low])}).
      </p>
      <button onClick={onClear} className="text-xs text-midnight-400 hover:text-white">
        Clear (Esc)
      </button>
    </div>
  )
}

/** A change in the monthly total, traced to the category behind it. Shading is relative to each category's own peak. */
export default function CategoryByMonth({
  data,
  currency,
  onSelect,
}: {
  data: CategoryMonths
  currency: string
  onSelect: (category: string, month: MonthKey) => void
}) {
  const [focus, setFocus] = useState<string | null>(null)
  const [thisMonth] = useState(() => new Date().getFullYear() * 12 + new Date().getMonth())

  useEffect(() => {
    if (!focus) {
      return
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocus(null)

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [focus])

  if (data.months.length < 2 || (data.rows.length === 0 && data.putAway.length === 0)) {
    return null
  }
  const money = (n: number) => formatCurrency(n, currency)
  const last = data.months.length - 1
  const focused = [...data.rows, ...data.putAway].find(r => r.category === focus)
  const row = (r: CategoryMonths['rows'][number]) => {
    const peak = Math.max(...r.cells, 1)
    const delta = r.usual !== null && r.usual > 0 ? r.cells[last] - r.usual : null

    return (
      <tr
        key={r.category}
        className={`border-t border-midnight-800 transition-opacity duration-150 ${
          focus && focus !== r.category ? 'opacity-25' : ''
        }`}
      >
        <th scope="row" className="sticky left-0 bg-midnight-900 py-1.5 pr-3 text-left font-normal text-white">
          <button
            onClick={() => setFocus(focus === r.category ? null : r.category)}
            aria-pressed={focus === r.category}
            aria-label={`Focus on ${r.category}`}
            className={`flex items-center rounded px-1 py-0.5 text-left hover:bg-midnight-800 ${
              focus === r.category ? 'bg-midnight-800 font-medium' : ''
            }`}
          >
            <span
              className="mr-2 inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: r.color }}
              aria-hidden="true"
            />
            {r.category}
          </button>
        </th>
        {r.cells.map((n, i) => (
          <td key={i} className="p-0.5 text-right tabular-nums">
            {n > 0 ? (
              <button
                onClick={() => onSelect(r.category, data.months[i])}
                aria-label={`${r.category}, ${label(data.months[i])}: ${money(n)}`}
                className="w-full rounded px-1.5 py-1 text-white hover:ring-1 hover:ring-midnight-500"
                style={{
                  backgroundColor: `color-mix(in srgb, ${r.color} ${Math.round((n / peak) * 45)}%, transparent)`,
                }}
              >
                {money(n)}
              </button>
            ) : (
              <span className="block px-1.5 py-1 text-midnight-600">–</span>
            )}
          </td>
        ))}
        <td
          className={`py-1.5 pl-3 text-right text-xs tabular-nums ${
            delta === null || Math.abs(delta) < 1 ? 'text-midnight-500' : delta > 0 ? 'text-amber-300' : 'text-accent'
          }`}
        >
          {delta === null || Math.abs(delta) < 1 ? '–' : `${delta > 0 ? '▲' : '▼'} ${money(Math.abs(delta))}`}
        </td>
      </tr>
    )
  }

  return (
    <section className="card !p-4 sm:!p-6">
      <h2 className="text-lg font-semibold text-white">Category by month</h2>
      <p className="mt-0.5 text-sm text-midnight-400">
        The last {data.months.length} months. The final column compares with the average of the months before it.
      </p>
      {focused && (
        <FocusSummary
          row={focused}
          months={data.months}
          thisMonth={thisMonth}
          money={money}
          onClear={() => setFocus(null)}
        />
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-midnight-500">
              <th className="sticky left-0 bg-midnight-900 py-1.5 pr-3 text-left font-normal">Category</th>
              {data.months.map(m => (
                <th key={`${m.year}-${m.month}`} className="px-1 py-1.5 text-center font-normal">
                  {label(m)}
                </th>
              ))}
              <th className="py-1.5 pl-3 text-right font-normal">vs usual</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(row)}
            {data.putAway.length > 0 && (
              <>
                <tr>
                  <th
                    colSpan={data.months.length + 2}
                    scope="colgroup"
                    className="pb-1 pt-4 text-left text-xs font-normal uppercase tracking-wide text-midnight-500"
                  >
                    Put away, not counted as spent
                  </th>
                </tr>
                {data.putAway.map(row)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
