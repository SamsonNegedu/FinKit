import { ChevronLeft, ChevronRight } from 'lucide-react'
import Tooltip from '@/shared/components/Tooltip'

export interface MonthPick {
  year: number
  month: number
}

const index = (m: MonthPick) => m.year * 12 + m.month
const label = (m: MonthPick) =>
  new Date(m.year, m.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

/** Steps through months between the first one with data and this one. There is no looking ahead. */
export default function MonthSwitcher({
  value,
  min,
  max,
  onChange,
}: {
  value: MonthPick
  min: MonthPick
  max: MonthPick
  onChange: (m: MonthPick) => void
}) {
  const step = (by: number) => {
    const i = index(value) + by

    onChange({ year: Math.floor(i / 12), month: i % 12 })
  }
  const arrow =
    'p-2.5 text-midnight-300 hover:bg-midnight-700 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'
  const current = index(value) >= index(max)

  return (
    <div className="flex items-center gap-2">
      {/* One bordered control, like the period picker in the header, so it reads as a control and not loose text */}
      <div className="flex items-center overflow-hidden rounded-lg border border-midnight-600 bg-midnight-800">
        <Tooltip label="Earlier month">
          <button
            className={arrow}
            aria-label="Earlier month"
            disabled={index(value) <= index(min)}
            onClick={() => step(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </Tooltip>
        <span
          className="min-w-[9.5rem] border-x border-midnight-600 px-3 py-2 text-center text-sm font-medium text-white"
          aria-live="polite"
        >
          {label(value)}
        </span>
        <Tooltip label="Later month">
          <button
            className={arrow}
            aria-label="Later month"
            disabled={index(value) >= index(max)}
            onClick={() => step(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
      {/* Always there, dimmed on the current month, so the controls do not shift as you step back */}
      <button className="btn-secondary text-sm disabled:opacity-40" disabled={current} onClick={() => onChange(max)}>
        This month
      </button>
    </div>
  )
}
