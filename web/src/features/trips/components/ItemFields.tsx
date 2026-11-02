import Checkbox from '@/shared/components/forms/Checkbox'
import Select from '@/shared/components/forms/Select'
import type { Trip } from '../api/trips.api'
import { placesOf } from './TripFields'
import CategoryPicker from './CategoryPicker'
import SubcategoryPicker from './SubcategoryPicker'

export interface ItemDraft {
  category: string
  subcategory: string
  place: string
  shared: boolean
  paidBy: string
}

const NONE = ''
const label = 'text-sm text-midnight-300'

/** How one cost counts: its category, where it was spent, and whether it is split with the others. */
export default function ItemFields({
  trip,
  value,
  onChange,
  manual,
}: {
  trip: Trip
  value: ItemDraft
  onChange: (v: ItemDraft) => void
  /** Only costs typed in by hand can have been paid by someone else */
  manual: boolean
}) {
  const set = (patch: Partial<ItemDraft>) => onChange({ ...value, ...patch })
  const places = placesOf(trip.location)

  return (
    <div className="space-y-3">
      <div className={label}>
        Category
        <div className="mt-1">
          <CategoryPicker value={value.category} onChange={category => set({ category, subcategory: '' })} />
        </div>
      </div>
      <div className={label}>
        Detail
        <div className="mt-1">
          <SubcategoryPicker
            category={value.category}
            value={value.subcategory}
            onChange={subcategory => set({ subcategory })}
          />
        </div>
      </div>
      {places.length > 1 && (
        <div className={label}>
          Place
          <Select
            className="mt-1 w-full"
            value={value.place}
            onChange={place => set({ place })}
            options={[{ value: NONE, label: 'Not assigned' }, ...places.map(p => ({ value: p, label: p }))]}
          />
        </div>
      )}
      {manual && trip.travelers.length > 0 && (
        <div className={label}>
          Paid by
          <Select
            className="mt-1 w-full"
            value={value.paidBy}
            onChange={paidBy => set({ paidBy })}
            options={[{ value: NONE, label: 'You' }, ...trip.travelers.map(n => ({ value: n, label: n }))]}
          />
        </div>
      )}
      {trip.travelers.length > 0 && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-midnight-200">
          <Checkbox checked={value.shared} onChange={shared => set({ shared })} ariaLabel="Split equally" />
          Split equally with {trip.travelers.join(', ')}
        </label>
      )}
    </div>
  )
}
