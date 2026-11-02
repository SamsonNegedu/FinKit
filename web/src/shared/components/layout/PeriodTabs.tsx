import { useMemo } from 'react'
import Select from '@/shared/components/forms/Select'
import SegmentedControl from '@/shared/components/forms/SegmentedControl'
import { useApp } from '@/shared/contexts/AppState'
import { monthRange, sameRange, yearRange, yearsWithData } from '@/shared/utils/periods'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ALL = 'all'

const FULL = 'full'

/** Year and month filter on one row. It sets the same period as the picker in the top bar. */
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
  const fullYear = activeYear !== undefined && sameRange(dateRange, yearRange(activeYear))

  return (
    <div className="mb-4 flex items-center gap-2" aria-label="Period">
      <Select
        className="py-1.5 text-sm min-w-28"
        ariaLabel="Year"
        value={activeYear === undefined ? ALL : String(activeYear)}
        onChange={v => setDateRange(v === ALL ? null : yearRange(Number(v)))}
        options={[
          { value: ALL, label: 'All time' },
          ...years.map(({ year }) => ({ value: String(year), label: String(year) })),
        ]}
      />
      {activeYear !== undefined && (
        <SegmentedControl
          ariaLabel="Month"
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          value={fullYear ? FULL : (months.find(m => sameRange(dateRange, monthRange(activeYear, m))) ?? '').toString()}
          onChange={v => setDateRange(v === FULL ? yearRange(activeYear) : monthRange(activeYear, Number(v)))}
          options={[{ value: FULL, label: 'Full year' }, ...months.map(m => ({ value: String(m), label: MONTHS[m] }))]}
        />
      )}
    </div>
  )
}
