import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useApp } from '@/shared/contexts/AppState'
import { monthlyTrend } from '@/shared/utils/analysis/monthlyTrend'
import { formatCurrency } from '@/shared/utils/format'
import { monthRange } from '@/shared/utils/periods'
import SegmentedControl from '@/shared/components/forms/SegmentedControl'
import MonthlyTrend from './charts/MonthlyTrend'

const KEY: Array<[string, string]> = [
  ['Spent', '#ef4444'],
  ['Put away', '#06b6d4'],
  ['Left over', '#10b981'],
]

type Span = '6' | '12' | 'all'

/**
 * Month by month: where each month's income went, and how an average month looks. It has its own span (the last 6 or
 * 12 months, or everything) because comparing months makes no sense inside a period that may be a single month.
 */
export default function TrendView() {
  const app = useApp()
  const navigate = useNavigate()
  const [span, setSpan] = useState<Span>('12')
  const all = useMemo(() => monthlyTrend(app.displayTransactions), [app.displayTransactions])
  const months = span === 'all' ? all : all.slice(-Number(span))
  const money = (n: number) => formatCurrency(n, app.baseCurrency)

  if (all.length < 2) {
    return <p className="text-midnight-400">Needs at least two months of transactions to compare them.</p>
  }
  const average = (pick: (m: (typeof months)[number]) => number) =>
    months.reduce((sum, m) => sum + pick(m), 0) / months.length

  return (
    <section className="card !p-4 sm:!p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Where each month’s income went</h2>
          <p className="mt-0.5 text-sm text-midnight-400">
            An average month: {money(average(m => m.spent))} spent, {money(average(m => m.putAway))} put away,{' '}
            {money(average(m => m.leftOver))} left over. The dashed line is income.
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Months to show"
          value={span}
          onChange={setSpan}
          options={[
            { value: '6', label: '6 months' },
            { value: '12', label: '12 months' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex gap-4 text-xs text-midnight-300">
          {KEY.map(([name, color]) => (
            <li key={name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
              {name}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <MonthlyTrend
          months={months}
          currency={app.baseCurrency}
          onSelectMonth={m => {
            app.setDateRange(monthRange(m.year, m.month))
            navigate({ to: '/analytics' })
          }}
        />
      </div>
    </section>
  )
}
