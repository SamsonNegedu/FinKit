import { Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DateRange, Transaction } from '@/shared/types'
import { formatDay } from '@/shared/utils/dates'
import { endOfDay, monthRange, sameRange as same, yearRange, yearsWithData } from '@/shared/utils/periods'

const item = (active: boolean) =>
  `w-full px-4 py-2 text-left text-sm hover:bg-midnight-700 ${active ? 'bg-accent/20 text-accent' : ''}`

interface PeriodPickerProps {
  dateRange: DateRange | null
  onChange: (range: DateRange | null) => void
  transactions: Transaction[] // used to offer the years and months you actually have data for
}

/** The one place the period (month, year, range or all time) is chosen. It applies to every screen. */
export default function PeriodPicker({ dateRange, onChange, transactions }: PeriodPickerProps) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const years = useMemo(() => yearsWithData(transactions), [transactions])

  const choose = (range: DateRange | null) => {
    onChange(range)
    setOpen(false)
  }

  const label = () => {
    if (!dateRange) {
      return 'All time'
    }
    const { startDate: s, endDate: e } = dateRange

    if (same(dateRange, yearRange(s.getFullYear()))) {
      return String(s.getFullYear())
    }
    if (same(dateRange, monthRange(s.getFullYear(), s.getMonth()))) {
      return s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    return `${formatDay(s)} ${s.getFullYear()} – ${formatDay(e)} ${e.getFullYear()}`
  }

  const [presets] = useState<Array<[string, DateRange]>>(() => {
    const now = new Date()

    return [
      ['This month', monthRange(now.getFullYear(), now.getMonth())],
      ['Last month', monthRange(now.getFullYear(), now.getMonth() - 1)],
      [
        'Last 3 months',
        {
          startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          endDate: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        },
      ],
      [
        'Last 12 months',
        {
          startDate: new Date(now.getFullYear(), now.getMonth() - 11, 1),
          endDate: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        },
      ],
    ]
  })

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="input flex items-center gap-2 min-w-[180px]"
        aria-expanded={open}
      >
        <Calendar className="w-4 h-4 text-midnight-400" />
        <span className="text-sm">{label()}</span>
        <ChevronDown className="w-4 h-4 text-midnight-400 ml-auto" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl z-50 w-64 max-h-[70vh] overflow-y-auto">
          <button onClick={() => choose(null)} className={`${item(!dateRange)} border-b border-midnight-700`}>
            All time
          </button>

          <div className="px-4 py-2 text-xs text-midnight-500 uppercase tracking-wide">Quick select</div>
          {presets.map(([name, range]) => (
            <button key={name} onClick={() => choose(range)} className={item(same(dateRange, range))}>
              {name}
            </button>
          ))}

          {years.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs text-midnight-500 uppercase tracking-wide border-t border-midnight-700">
                From your data
              </div>
              {years.map(({ year, months }) => {
                const isOpen = (expanded ?? dateRange?.startDate.getFullYear()) === year

                return (
                  <div key={year}>
                    <div className="flex items-stretch">
                      <button
                        onClick={() => choose(yearRange(year))}
                        className={`${item(same(dateRange, yearRange(year)))} flex-1 font-medium`}
                      >
                        {year}
                      </button>
                      <button
                        onClick={() => setExpanded(isOpen ? -1 : year)}
                        className="px-3 text-midnight-400 hover:bg-midnight-700"
                        aria-label={`${isOpen ? 'Hide' : 'Show'} months of ${year}`}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                    {isOpen &&
                      months.map(m => {
                        const range = monthRange(year, m)

                        return (
                          <button
                            key={m}
                            onClick={() => choose(range)}
                            className={`${item(same(dateRange, range))} pl-8 text-midnight-200`}
                          >
                            {new Date(year, m, 1).toLocaleDateString('en-US', { month: 'long' })}
                          </button>
                        )
                      })}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
