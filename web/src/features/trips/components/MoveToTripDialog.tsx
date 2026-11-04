import { useState } from 'react'
import type { Transaction } from '@/shared/types'
import { useApp } from '@/shared/contexts/AppState'
import { displayNameOf } from '@/shared/utils/aliases'
import { formatDay } from '@/shared/utils/dates'
import { formatCurrency } from '@/shared/utils/format'
import { linkKey } from '@/shared/utils/ids'
import { useCreateTrip, useTagItems, useTrips } from '../hooks/trips-queries'
import type { Trip, TripItemKind } from '../api/trips.api'
import { guessTripItem } from '../utils/tripGuess'
import CategoryPicker from './CategoryPicker'
import TripFields, { EMPTY_TRIP, isTripDraftValid, tripPayload } from './TripFields'
import Checkbox from '@/shared/components/forms/Checkbox'
import Select from '@/shared/components/forms/Select'
import Modal from '@/shared/components/forms/Modal'
import RadioGroup from '@/shared/components/forms/RadioGroup'

interface Props {
  transactions: Transaction[]
  onClose: () => void
  onDone: () => void
}

const NEW = '__new'

/** The trip whose travel dates hold the most of these transactions, so the common case needs no choosing. */
function bestTrip(trips: Trip[], dates: string[]): Trip | undefined {
  const score = (t: Trip) =>
    t.startDate && t.endDate ? dates.filter(d => d >= t.startDate! && d <= t.endDate!).length : 0
  const best = trips.reduce<Trip | undefined>((a, t) => (!a || score(t) > score(a) ? t : a), undefined)

  return best && score(best) > 0 ? best : undefined
}

/**
 * Moves the selected bank transactions into a trip: they leave the months and count towards the trip. Everything
 * selected is listed and ticked, so a stray one is unticked here rather than hunted down in the table first.
 */
export default function MoveToTripDialog({ transactions, onClose, onDone }: Props) {
  const app = useApp()
  const { data: allTrips = [] } = useTrips()
  // A finished trip is archived: new transactions go to the ones still running
  const trips = allTrips.filter(t => !t.archived)
  const create = useCreateTrip()
  const tag = useTagItems()
  const [chosen, setChosen] = useState<string | null>(null)
  const [draft, setDraft] = useState(EMPTY_TRIP)
  // Money coming in is what funds a trip. Added as costs it would show up as a refund and make the spending negative.
  const [kind, setKind] = useState<TripItemKind>(
    transactions.length > 0 && transactions.every(t => t.type === 'income') ? 'funding' : 'cost',
  )
  // By default each payee gets its own guessed category; "one for all" overrides that
  const [sameCategory, setSameCategory] = useState(false)
  const [category, setCategory] = useState('Other')
  const [off, setOff] = useState<ReadonlySet<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Only transactions the bank synced exist on the server; imported files stay in the browser
  const rows = transactions.flatMap(t => {
    const ref = app.tripLinks.refByKey.get(linkKey(t))

    return ref ? [{ t, ref, guess: guessTripItem(`${displayNameOf(t)} ${t.description}`) }] : []
  })
  const skipped = transactions.length - rows.length
  const picked = rows.filter(r => !off.has(r.ref))
  const total = picked.reduce((sum, r) => sum + r.t.amount, 0)
  const tripId =
    chosen ??
    bestTrip(
      trips,
      rows.map(r => r.t.date),
    )?.id ??
    trips[0]?.id ??
    NEW
  const target = tripId === NEW ? undefined : (trips.find(t => t.id === tripId) ?? trips[0])
  const canSave = picked.length > 0 && (tripId === NEW ? isTripDraftValid(draft) : !!target)
  const busy = create.isPending || tag.isPending
  const flip = (ref: string) =>
    setOff(prev => {
      const next = new Set(prev)

      if (!next.delete(ref)) {
        next.add(ref)
      }

      return next
    })

  const save = async () => {
    setError(null)
    try {
      const id = target?.id ?? (await create.mutateAsync(tripPayload(draft, app.baseCurrency))).id

      await tag.mutateAsync({
        id,
        items: picked.map(({ ref, guess }) => ({
          ref,
          kind,
          ...(kind === 'cost'
            ? sameCategory || !guess
              ? { category: sameCategory ? category : 'Other' }
              : { category: guess.category, ...(guess.subcategory ? { subcategory: guess.subcategory } : {}) }
            : {}),
        })),
      })
      app.pushToast({
        message: `Moved ${picked.length} transaction${picked.length === 1 ? '' : 's'} to ${target?.name ?? draft.name.trim()}`,
        tone: 'success',
      })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  return (
    <Modal title="Move to a trip" onClose={onClose} width="max-w-lg">
      <div className="mt-3 space-y-4">
        <p className="text-sm text-midnight-400">
          They leave your monthly view and count towards the trip instead, because a separate balance paid for them.
          Untick any that were not part of it.
        </p>
        {skipped > 0 && (
          <p className="text-sm text-warning">
            {skipped} not from a bank sync will stay where they are: imported files never leave this browser.
          </p>
        )}
        <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line px-3">
          {rows.map(({ t, ref, guess }) => (
            <li key={ref} className="flex items-center gap-3 py-2">
              <Checkbox checked={!off.has(ref)} onChange={() => flip(ref)} ariaLabel={`Move ${displayNameOf(t)}`} />
              <span className="w-14 shrink-0 text-sm text-midnight-400">{formatDay(t.date)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{displayNameOf(t)}</span>
              {kind === 'cost' && !sameCategory && (
                <span className="hidden text-xs text-midnight-400 sm:block">
                  {guess ? [guess.category, guess.subcategory].filter(Boolean).join(' · ') : 'Other'}
                </span>
              )}
              <span className="text-sm tabular-nums text-midnight-200">{formatCurrency(t.amount, t.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="text-sm text-midnight-300">
          <label htmlFor="move-trip">Trip</label>
          <Select
            id="move-trip"
            className="w-full mt-1"
            value={tripId}
            onChange={setChosen}
            options={[
              ...trips.map(t => ({ value: t.id, label: `${t.name} · ${t.location}` })),
              { value: NEW, label: '+ New trip…' },
            ]}
          />
        </div>
        {tripId === NEW && <TripFields draft={draft} onChange={setDraft} currency={app.baseCurrency} />}
        <div className="text-sm text-midnight-300">
          <p className="mb-2">These are</p>
          <RadioGroup
            ariaLabel="These are"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'cost', label: 'Trip costs' },
              { value: 'funding', label: 'Money put into the trip' },
            ]}
          />
        </div>
        {kind === 'cost' && (
          <div className="text-sm text-midnight-300">
            <p className="mb-2">Category</p>
            <RadioGroup
              ariaLabel="Category"
              value={sameCategory ? 'same' : 'guess'}
              onChange={v => setSameCategory(v === 'same')}
              options={[
                { value: 'guess', label: 'Guess from each payee' },
                { value: 'same', label: 'One category for all' },
              ]}
            />
            {sameCategory && (
              <div className="mt-2">
                <CategoryPicker value={category} onChange={setCategory} />
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-expense">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary disabled:opacity-50" disabled={!canSave || busy} onClick={save}>
            {busy ? 'Moving…' : `Move ${picked.length} · ${formatCurrency(total, app.baseCurrency)}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
