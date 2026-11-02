import { Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DateRange, Transaction } from '@/shared/types'
import { endOfDay, monthRange, periodLabel, sameRange as same, yearRange, yearsWithData } from '@/shared/utils/periods'

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

  const years = useMemo(() => yearsWithData(transactions), [transactions])

  const choose = (range: DateRange | null) => {
    onChange(range)
    setOpen(false)
  }

  const label = () => periodLabel(dateRange)

  // A phone has no room for two full dates: shorten the years so the label stays on one line
  const shortLabel = () => {
    const full = label()

    return full.includes(' – ') ? full.replace(/\b20(\d\d)\b/g, "'$1") : full
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
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="min-w-0 max-md:flex-1">
        <Popover.Trigger asChild>
          <button className="input flex w-full items-center gap-2 max-sm:px-3 sm:min-w-[180px]">
            <Calendar className="hidden w-4 h-4 shrink-0 text-midnight-400 sm:block" />
            <span className="min-w-0 truncate text-xs sm:hidden">{shortLabel()}</span>
            <span className="hidden text-sm whitespace-nowrap sm:inline">{label()}</span>
            <ChevronDown className="w-4 h-4 shrink-0 text-midnight-400 ml-auto" />
          </button>
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-[80] w-64 max-w-[calc(100vw-2rem)] max-h-[min(70vh,var(--radix-popover-content-available-height))] overflow-y-auto rounded-lg border border-midnight-600 bg-midnight-800 shadow-xl"
        >
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
