import { useMemo, useState } from 'react'
import { Plane } from 'lucide-react'
import { useApp } from '@/shared/contexts/AppState'
import { displayNameOf } from '@/shared/utils/aliases'
import { formatDay } from '@/shared/utils/dates'
import { formatCurrency } from '@/shared/utils/format'
import { linkKey } from '@/shared/utils/ids'
import { loadSkipped, saveSkipped } from '../utils/skippedSuggestions'
import { isTravelBooking, guessTripItem } from '../utils/tripGuess'
import type { Candidate } from '../utils/tripCandidates'

// One list for the whole page, kept apart from any single trip's skipped items
const SKIP_KEY = 'starters'
// A few at a time, newest first: there is no cutoff, because a trip can be sorted out years after it happened
const SHOWN = 4

/**
 * Flights and stays that are not in any trip yet, offered as a way to start one. A booking is the one thing that
 * reliably says "a trip is coming"; where it goes and when is for you to fill in, and then the trip's own
 * suggestions take over.
 */
export default function TripStarters({ onStart }: { onStart: (seed: Candidate) => void }) {
  const app = useApp()
  const [skipped, setSkipped] = useState(() => loadSkipped(SKIP_KEY))
  const [showAll, setShowAll] = useState(false)
  const all = useMemo(() => {
    return app.displayTransactions
      .flatMap(t => {
        const ref = app.tripLinks.refByKey.get(linkKey(t))
        const text = `${displayNameOf(t)} ${t.description}`

        return ref && !skipped.has(ref) && t.type === 'expense' && isTravelBooking(text)
          ? [{ ref, t, guess: guessTripItem(text) }]
          : []
      })
      .sort((a, b) => b.t.date.localeCompare(a.t.date))
  }, [app.displayTransactions, app.tripLinks.refByKey, skipped])
  const rows = showAll ? all : all.slice(0, SHOWN)

  if (all.length === 0) {
    return null
  }
  const skip = (ref: string) => {
    const next = new Set([...skipped, ref])

    saveSkipped(SKIP_KEY, next)
    setSkipped(next)
  }

  return (
    <section className="card !p-4" aria-label="Bookings that could start a trip">
      <p className="flex items-center gap-2 text-sm text-midnight-200">
        <Plane className="h-4 w-4 text-accent" aria-hidden="true" /> Flights and stays not in a trip yet. Start one from
        a booking?
      </p>
      <ul className="mt-2 divide-y divide-line">
        {rows.map(c => (
          <li key={c.ref} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="w-14 shrink-0 text-sm text-midnight-400">{formatDay(c.t.date)}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{displayNameOf(c.t)}</span>
            <span className="text-sm tabular-nums text-midnight-200">{formatCurrency(c.t.amount, c.t.currency)}</span>
            <span className="flex gap-2">
              <button className="btn-secondary !px-3 !py-1 text-sm" onClick={() => onStart(c)}>
                Start a trip
              </button>
              <button className="btn-secondary !px-3 !py-1 text-sm" onClick={() => skip(c.ref)}>
                Not a trip
              </button>
            </span>
          </li>
        ))}
      </ul>
      {all.length > SHOWN && (
        <button className="pt-2 text-xs text-accent hover:underline" onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show fewer' : `Show ${all.length - SHOWN} more`}
        </button>
      )}
    </section>
  )
}
