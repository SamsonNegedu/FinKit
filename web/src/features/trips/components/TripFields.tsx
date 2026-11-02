import DateRangePicker from '@/shared/components/forms/DateRangePicker'
import type { Trip } from '../api/trips.api'

export interface TripDraft {
  name: string
  location: string
  startDate: string
  endDate: string
  budget: string
  /** The other people on the trip, comma separated */
  travelers: string
}

export const EMPTY_TRIP: TripDraft = { name: '', location: '', startDate: '', endDate: '', budget: '', travelers: '' }

export const draftOf = (t: Trip): TripDraft => ({
  name: t.name,
  location: t.location,
  startDate: t.startDate ?? '',
  endDate: t.endDate ?? '',
  budget: t.budget ? String(t.budget) : '',
  travelers: t.travelers.join(', '),
})

/** Cities or places named in the location, so a cost can be assigned to one ("Hull, Manchester"). */
export const placesOf = (location: string): string[] => [
  ...new Set(
    location
      .split(',')
      .map(p => p.trim())
      .filter(Boolean),
  ),
]

const namesOf = (text: string) => [
  ...new Set(
    text
      .split(',')
      .map(n => n.trim())
      .filter(Boolean),
  ),
]

export const isTripDraftValid = (d: TripDraft) =>
  d.name.trim() !== '' &&
  d.location.trim() !== '' &&
  (!d.startDate || !d.endDate || d.endDate >= d.startDate) &&
  (d.budget === '' || Number(d.budget) > 0) &&
  namesOf(d.travelers).length <= 10

export const tripPayload = (d: TripDraft, currency: string) => ({
  name: d.name.trim(),
  location: d.location.trim(),
  startDate: d.startDate || null,
  endDate: d.endDate || null,
  budget: d.budget ? Number(d.budget) : null,
  budgetCurrency: d.budget ? currency : null,
  travelers: namesOf(d.travelers),
})

/** Name, place, optional travel dates, budget and who goes along. Planning and bookings can fall before the dates. */
export default function TripFields({
  draft,
  onChange,
  currency,
}: {
  draft: TripDraft
  onChange: (d: TripDraft) => void
  currency: string
}) {
  const set = (patch: Partial<TripDraft>) => onChange({ ...draft, ...patch })

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm text-midnight-300">
        Name
        <input
          className="input w-full mt-1"
          value={draft.name}
          maxLength={80}
          placeholder="Summer in Lisbon"
          onChange={e => set({ name: e.target.value })}
        />
      </label>
      <label className="text-sm text-midnight-300">
        Places (comma separated)
        <input
          className="input w-full mt-1"
          value={draft.location}
          maxLength={80}
          placeholder="Lisbon, Porto"
          onChange={e => set({ location: e.target.value })}
        />
      </label>
      <div className="text-sm text-midnight-300 sm:col-span-2">
        Travel dates (optional)
        <div className="mt-1">
          <DateRangePicker
            start={draft.startDate}
            end={draft.endDate}
            placeholder="Planning can start earlier"
            onChange={(startDate, endDate) => set({ startDate, endDate })}
          />
        </div>
      </div>
      <label className="text-sm text-midnight-300">
        Budget in {currency} (optional)
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          className="input w-full mt-1"
          value={draft.budget}
          onChange={e => set({ budget: e.target.value })}
        />
      </label>
      <label className="text-sm text-midnight-300">
        Travelling with (optional)
        <input
          className="input w-full mt-1"
          value={draft.travelers}
          placeholder="Sam, Alex"
          onChange={e => set({ travelers: e.target.value })}
        />
      </label>
    </div>
  )
}
