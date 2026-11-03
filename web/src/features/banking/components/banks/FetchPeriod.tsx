import { useEffect, useState } from 'react'
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

  // Escape closes the form, like the dialogs elsewhere in the app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', onKey)

    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div role="group" aria-label="Fetch a period" className="space-y-3 border-t border-line-strong pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-medium text-ink">Fetch a period</h3>
        <p className="text-xs text-midnight-400">
          Up to a year at a time. Doesn't use the bank's daily sync allowance. Banks differ in how far back they go.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
                  : 'border-line-strong text-midnight-300 hover:border-midnight-500 hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          )
        })}
        <div className="w-full sm:ml-2 sm:w-64">
          <DateRangePicker
            start={range.start}
            end={range.end}
            placeholder="Or pick your own dates"
            onChange={(start, end) => setRange({ start, end })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        <button type="button" className="text-sm text-midnight-400 hover:text-ink" onClick={onCancel}>
          Cancel
        </button>
        {complete && (
          <span className={`text-xs ${tooWide ? 'text-expense' : 'text-midnight-400'}`}>
            {tooWide ? `${days} days is more than a year. Pick a shorter stretch.` : `${days} days`}
          </span>
        )}
      </div>
    </div>
  )
}
