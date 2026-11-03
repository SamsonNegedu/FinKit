import { formatCurrency } from '@/shared/utils/format'
import type { MonthRow } from '@/shared/utils/analysis/monthly'

const name = (m: MonthRow) =>
  new Date(m.year, m.month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

/** Twelve months side by side: how much goes out, into investments and into savings, month by month. Opening a row makes that month the period. */
export default function MonthByMonth({
  rows,
  currency,
  onSelect,
}: {
  rows: MonthRow[]
  currency: string
  onSelect: (m: MonthRow) => void
}) {
  if (rows.length < 2) {
    return null
  }
  const money = (n: number) => formatCurrency(n, currency)
  const max = Math.max(...rows.map(r => r.spent), 1)

  return (
    <section className="card !p-4 sm:!p-6">
      <h2 className="text-lg font-semibold text-white">Month by month</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-midnight-500">
              <th className="py-1.5 pr-3 font-normal">Month</th>
              <th className="py-1.5 pr-3 text-right font-normal">Income</th>
              <th className="w-1/3 py-1.5 pr-3 font-normal">Spent</th>
              <th className="py-1.5 pr-3 text-right font-normal">Invested</th>
              <th className="py-1.5 pr-3 text-right font-normal">Saved</th>
              <th
                className="py-1.5 text-right font-normal"
                title="Income minus spent, invested and saved. Worked out, not recorded."
              >
                Left over
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`${r.year}-${r.month}`} className="border-t border-midnight-800 hover:bg-midnight-800/50">
                <td className="py-2 pr-3">
                  <button
                    className="text-left text-white hover:underline"
                    aria-label={`Show ${name(r)}`}
                    onClick={() => onSelect(r)}
                  >
                    {name(r)}
                  </button>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-midnight-300">{money(r.income)}</td>
                <td className="py-2 pr-3" aria-label={`Spent ${money(r.spent)}`}>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-midnight-800" aria-hidden>
                      <span
                        className="block h-full rounded-full bg-accent/70"
                        style={{ width: `${(r.spent / max) * 100}%` }}
                      />
                    </span>
                    <span className="w-24 text-right tabular-nums text-white">{money(r.spent)}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-white">
                  {money(r.invested)}
                  {r.investedRate !== null && r.invested > 0 && (
                    <span className="ml-1 text-xs text-midnight-500">{Math.round(r.investedRate)}%</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-midnight-300">{money(r.saved)}</td>
                <td className={`py-2 text-right tabular-nums ${r.leftOver < 0 ? 'text-expense' : 'text-midnight-400'}`}>
                  {money(r.leftOver)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
