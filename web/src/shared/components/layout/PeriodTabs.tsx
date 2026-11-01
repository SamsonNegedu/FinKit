import { useMemo } from 'react'
import { useApp } from '@/shared/contexts/AppState'
import { monthRange, sameRange, yearRange, yearsWithData } from '@/shared/utils/periods'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pill = (active: boolean) =>
  `shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    active ? 'bg-accent text-white' : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
  }`

/** Year and month filter shown on the page itself. It sets the same period as the picker in the top bar. */
export default function PeriodTabs() {
  const { displayTransactions, dateRange, setDateRange } = useApp()
  const years = useMemo(() => yearsWithData(displayTransactions), [displayTransactions])

  if (years.length === 0) {
    return null
  }

  // The year being looked at: the one the current period sits inside, if any
  const start = dateRange?.startDate
  const inOneYear = !!dateRange && start!.getFullYear() === dateRange.endDate.getFullYear()
  const activeYear = inOneYear ? start!.getFullYear() : undefined
  const months = [...(years.find(y => y.year === activeYear)?.months ?? [])].sort((a, b) => a - b)

  return (
    <div className="space-y-2 mb-6" aria-label="Period">
      <div
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Year"
      >
        <button role="tab" aria-selected={!dateRange} onClick={() => setDateRange(null)} className={pill(!dateRange)}>
          All time
        </button>
        {years.map(({ year }) => (
          <button
            key={year}
            role="tab"
            aria-selected={activeYear === year}
            onClick={() => setDateRange(yearRange(year))}
            className={pill(activeYear === year)}
          >
            {year}
          </button>
        ))}
      </div>
      {activeYear !== undefined && months && (
        <div
          className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Month"
        >
          <button
            role="tab"
            aria-selected={sameRange(dateRange, yearRange(activeYear))}
            onClick={() => setDateRange(yearRange(activeYear))}
            className={pill(sameRange(dateRange, yearRange(activeYear)))}
          >
            Full year
          </button>
          {months.map(m => (
            <button
              key={m}
              role="tab"
              aria-selected={sameRange(dateRange, monthRange(activeYear, m))}
              onClick={() => setDateRange(monthRange(activeYear, m))}
              className={pill(sameRange(dateRange, monthRange(activeYear, m)))}
            >
              {MONTHS[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
