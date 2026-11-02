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
    'rounded-lg p-1.5 text-midnight-300 hover:bg-midnight-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'

  return (
    <div className="flex items-center gap-1">
      <Tooltip label="Earlier month">
        <button
          className={arrow}
          aria-label="Earlier month"
          disabled={index(value) <= index(min)}
          onClick={() => step(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </Tooltip>
      <span className="min-w-36 text-center text-sm font-medium text-white" aria-live="polite">
        {label(value)}
      </span>
      <Tooltip label="Later month">
        <button
          className={arrow}
          aria-label="Later month"
          disabled={index(value) >= index(max)}
          onClick={() => step(1)}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </Tooltip>
      {index(value) < index(max) && (
        <button className="ml-1 text-xs text-accent hover:underline" onClick={() => onChange(max)}>
          This month
        </button>
      )}
    </div>
  )
}
