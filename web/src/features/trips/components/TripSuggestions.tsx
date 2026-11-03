import { useMemo, useState, type ReactNode } from 'react'
import { useApp } from '@/shared/contexts/AppState'
import Checkbox from '@/shared/components/forms/Checkbox'
import DateRangePicker from '@/shared/components/forms/DateRangePicker'
import { displayNameOf } from '@/shared/utils/aliases'
import { formatDay } from '@/shared/utils/dates'
import { formatCurrency } from '@/shared/utils/format'
import { rawKey } from '@/shared/utils/ids'
import type { Trip } from '../api/trips.api'
import { useTagItems } from '../hooks/trips-queries'
import { loadSkipped, saveSkipped } from '../utils/skippedSuggestions'
import { tripCandidates, type Candidate } from '../utils/tripCandidates'

/** How many earlier bookings show before "Show more": a long history would otherwise fill the page. */
const EARLIER_SHOWN = 6

/** A copy of the set with `ref` added, or taken out if it was there. */
const flip = (set: ReadonlySet<string>, ref: string) => {
  const next = new Set(set)

  if (!next.delete(ref)) {
    next.add(ref)
  }

  return next
}

/**
 * Staging area for a trip. Pick a date range (the travel dates to begin with) and every synced transaction in it
 * is ticked; untick what was not part of the trip and add the rest in one go. Flights and stays paid before the
 * range are listed too but start unticked: a booking does not say which trip it is for, so you choose.
 */
export default function TripSuggestions({ trip }: { trip: Trip }) {
  const app = useApp()
  const tag = useTagItems()
  // Said not to be part of this trip: never offered again
  const [dismissed, setDismissed] = useState(() => loadSkipped(trip.id))
  const [range, setRange] = useState({ start: trip.startDate ?? '', end: trip.endDate ?? '' })
  // Only the exceptions are kept: unticked among the in-range ones, ticked among the earlier ones
  const [off, setOff] = useState<ReadonlySet<string>>(new Set())
  const [on, setOn] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [allEarlier, setAllEarlier] = useState(false)
  const complete = range.start !== '' && range.end !== ''
  const { inside, earlier } = useMemo(
    () =>
      complete
        ? tripCandidates(
            app.displayTransactions,
            t => app.tripLinks.refByKey.get(rawKey(t)),
            dismissed,
            range.start,
            range.end,
          )
        : { inside: [], earlier: [] },
    [app.displayTransactions, app.tripLinks.refByKey, dismissed, range, complete],
  )
  const isOn = (c: Candidate, group: 'inside' | 'earlier') => (group === 'inside' ? !off.has(c.ref) : on.has(c.ref))
  const picked = [...inside.filter(c => isOn(c, 'inside')), ...earlier.filter(c => isOn(c, 'earlier'))]
  const total = picked.reduce((sum, c) => sum + c.t.amount, 0)
  const atTripDates = range.start === (trip.startDate ?? '') && range.end === (trip.endDate ?? '')

  if (trip.startDate && atTripDates && inside.length === 0 && earlier.length === 0) {
    return null
  }
  const setGroup = (group: 'inside' | 'earlier', rows: Candidate[], ticked: boolean) => {
    const refs = new Set(rows.map(c => c.ref))

    if (group === 'inside') {
      setOff(prev => new Set(ticked ? [...prev].filter(r => !refs.has(r)) : [...prev, ...refs]))
    } else {
      setOn(prev => new Set(ticked ? [...prev, ...refs] : [...prev].filter(r => !refs.has(r))))
    }
  }
  const add = async () => {
    setBusy(true)
    try {
      await tag.mutateAsync({
        id: trip.id,
        // A guess from the payee's name; anything it can't place goes to Other
        items: picked.map(c => ({
          ref: c.ref,
          kind: 'cost' as const,
          category: c.guess?.category ?? 'Other',
          ...(c.guess?.subcategory ? { subcategory: c.guess.subcategory } : {}),
        })),
      })
      app.pushToast({
        message: `Added ${picked.length === 1 ? '1 transaction' : `${picked.length} transactions`} to ${trip.name}`,
        tone: 'success',
      })
      setOff(new Set())
      setOn(new Set())
    } finally {
      setBusy(false)
    }
  }
  const hideUnticked = () => {
    const refs = [...inside.filter(c => !isOn(c, 'inside')), ...earlier.filter(c => !isOn(c, 'earlier'))].map(
      c => c.ref,
    )
    const next = new Set([...dismissed, ...refs])

    saveSkipped(trip.id, next)
    setDismissed(next)
  }
  const unticked = inside.length + earlier.length - picked.length
  const group = (key: 'inside' | 'earlier', title: string, all: Candidate[], more?: ReactNode) => {
    // Tick all and Untick all act on what is shown, never on rows still folded away
    const rows = key === 'earlier' && !allEarlier ? all.slice(0, EARLIER_SHOWN) : all

    return all.length === 0 ? null : (
      <div>
        <div className="flex items-center justify-between gap-2 pt-3">
          <h3 className="text-sm font-medium text-midnight-300">
            {title} ({all.length})
          </h3>
          <span className="flex gap-3 text-xs">
            <button className="text-accent hover:underline" onClick={() => setGroup(key, rows, true)}>
              Tick all
            </button>
            <button className="text-accent hover:underline" onClick={() => setGroup(key, rows, false)}>
              Untick all
            </button>
          </span>
        </div>
        <ul className="mt-1 max-h-72 divide-y divide-line overflow-y-auto">
          {rows.map(c => (
            <li key={c.ref} className="flex items-center gap-3 py-2">
              <Checkbox
                checked={isOn(c, key)}
                onChange={() => (key === 'inside' ? setOff(flip(off, c.ref)) : setOn(flip(on, c.ref)))}
                ariaLabel={`Add ${displayNameOf(c.t)} to the trip`}
              />
              <span className="w-14 shrink-0 text-sm text-midnight-400">{formatDay(c.t.date)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{displayNameOf(c.t)}</span>
              <span className="hidden text-xs text-midnight-400 sm:block">
                {c.guess ? [c.guess.category, c.guess.subcategory].filter(Boolean).join(' · ') : 'Other'}
              </span>
              <span className="text-sm tabular-nums text-midnight-200">{formatCurrency(c.t.amount, c.t.currency)}</span>
            </li>
          ))}
        </ul>
        {more}
      </div>
    )
  }

  return (
    <section className="card !p-4" aria-label="Add transactions to the trip">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink">Add transactions</h2>
          <p className="text-xs text-midnight-400">
            Everything in the range is ticked. Untick what was not part of the trip, then add the rest.
          </p>
        </div>
        <div className="w-56">
          <DateRangePicker
            start={range.start}
            end={range.end}
            placeholder="Pick a date range"
            onChange={(start, end) => setRange({ start, end })}
          />
        </div>
      </div>
      {complete && inside.length === 0 && earlier.length === 0 && (
        <p className="mt-3 text-sm text-midnight-400">No synced transactions outside a trip in this range.</p>
      )}
      {group('inside', 'In the range', inside)}
      {group(
        'earlier',
        'Flights and stays paid before this, nearest first',
        earlier,
        earlier.length > EARLIER_SHOWN && (
          <button className="pt-2 text-xs text-accent hover:underline" onClick={() => setAllEarlier(v => !v)}>
            {allEarlier ? 'Show fewer' : `Show ${earlier.length - EARLIER_SHOWN} more`}
          </button>
        ),
      )}
      {(inside.length > 0 || earlier.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          {unticked > 0 && (
            <button
              className="text-xs text-accent underline underline-offset-2 hover:no-underline"
              onClick={hideUnticked}
            >
              Hide the {unticked} unticked for this trip
            </button>
          )}
          <button className="btn-primary ml-auto" disabled={picked.length === 0 || busy} onClick={add}>
            Add {picked.length} to trip{picked.length > 0 ? ` · ${formatCurrency(total, app.baseCurrency)}` : ''}
          </button>
        </div>
      )}
      {tag.error && <p className="mt-2 text-sm text-expense">{tag.error.message}</p>}
    </section>
  )
}
