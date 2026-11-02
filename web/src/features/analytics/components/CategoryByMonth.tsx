import { formatCurrency } from '@/shared/utils/format'
import type { CategoryMonths, MonthKey } from '@/shared/utils/analysis/categoryMonths'

const label = (m: MonthKey) => new Date(m.year, m.month, 1).toLocaleDateString('en-US', { month: 'short' })

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
  if (data.months.length < 2 || data.rows.length === 0) {
    return null
  }
  const money = (n: number) => formatCurrency(n, currency)
  const last = data.months.length - 1

  return (
    <section className="card !p-4 sm:!p-6">
      <h2 className="text-lg font-semibold text-white">Category by month</h2>
      <p className="mt-0.5 text-sm text-midnight-400">
        The last {data.months.length} months. The final column compares with the average of the months before it.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-midnight-500">
              <th className="sticky left-0 bg-midnight-900 py-1.5 pr-3 text-left font-normal">Category</th>
              {data.months.map(m => (
                <th key={`${m.year}-${m.month}`} className="px-1 py-1.5 text-right font-normal">
                  {label(m)}
                </th>
              ))}
              <th className="py-1.5 pl-3 text-right font-normal">vs usual</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(r => {
              const peak = Math.max(...r.cells, 1)
              const delta = r.usual !== null && r.usual > 0 ? r.cells[last] - r.usual : null

              return (
                <tr key={r.category} className="border-t border-midnight-800">
                  <th
                    scope="row"
                    className="sticky left-0 bg-midnight-900 py-1.5 pr-3 text-left font-normal text-white"
                  >
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: r.color }}
                      aria-hidden="true"
                    />
                    {r.category}
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
                      delta === null || Math.abs(delta) < 1
                        ? 'text-midnight-500'
                        : delta > 0
                          ? 'text-amber-300'
                          : 'text-accent'
                    }`}
                  >
                    {delta === null || Math.abs(delta) < 1 ? '–' : `${delta > 0 ? '▲' : '▼'} ${money(Math.abs(delta))}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
