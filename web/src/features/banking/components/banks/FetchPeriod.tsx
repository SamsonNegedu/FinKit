import { useState } from 'react'
import { Download } from 'lucide-react'
import DateRangePicker from '@/shared/components/forms/DateRangePicker'
import { formatDay, toISODate } from '@/shared/utils/dates'

/** The server refuses a range wider than this; saying so here saves a failed request. */
const MAX_DAYS = 366
const MS_PER_DAY = 86_400_000

interface Props {
  disabled: boolean
  onFetch: (from: string, to: string) => void
  onCancel: () => void
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY) + 1

const iso = (y: number, m: number, d: number) => toISODate(new Date(y, m, d))

/** Shortcuts: the latest stretches, then whole calendar years, which is how you would work back through old history. */
function presets(today: Date) {
  const y = today.getFullYear()
  const now = toISODate(today)

  return [
    { label: 'Last 3 months', from: iso(y, today.getMonth() - 3, today.getDate()), to: now },
    { label: 'Last 12 months', from: iso(y - 1, today.getMonth(), today.getDate() + 1), to: now },
    ...[1, 2, 3].map(back => ({ label: String(y - back), from: iso(y - back, 0, 1), to: iso(y - back, 11, 31) })),
  ]
}

/**
 * Fetch one stretch of older history. It runs as you being present, so it does not spend the bank's small daily
 * allowance for background requests, which is why this is the way to reach years back quickly.
 */
export default function FetchPeriod({ disabled, onFetch, onCancel }: Props) {
  const [range, setRange] = useState({ start: '', end: '' })
  const [chips] = useState(() => presets(new Date()))
  const complete = range.start !== '' && range.end !== ''
  const days = complete ? daysBetween(range.start, range.end) : 0
  const tooWide = days > MAX_DAYS

  return (
    <div className="space-y-4 rounded-xl border border-midnight-700 bg-midnight-900/40 p-4">
      <div>
        <h3 className="text-sm font-medium text-white">Fetch a period</h3>
        <p className="mt-0.5 text-xs text-midnight-400">
          Up to a year at a time. It counts as you being here, so it does not use the bank's daily allowance for
          background syncs. Banks differ in how far back they will go.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map(p => {
          const active = range.start === p.from && range.end === p.to

          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => setRange({ start: p.from, end: p.to })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-midnight-600 text-midnight-300 hover:border-midnight-500 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <DateRangePicker
            start={range.start}
            end={range.end}
            placeholder="Or pick your own dates"
            onChange={(start, end) => setRange({ start, end })}
          />
        </div>
        {complete && (
          <span className={`text-xs ${tooWide ? 'text-expense' : 'text-midnight-400'}`}>
            {tooWide ? `${days} days is more than a year. Pick a shorter stretch.` : `${days} days`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="btn-primary flex items-center gap-2 text-sm"
          disabled={!complete || tooWide || disabled}
          onClick={() => onFetch(range.start, range.end)}
        >
          <Download className="h-4 w-4" />
          {complete && !tooWide
            ? `Fetch ${formatDay(range.start, true)} – ${formatDay(range.end, true)}`
            : 'Fetch transactions'}
        </button>
        <button type="button" className="text-sm text-midnight-400 hover:text-white" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
