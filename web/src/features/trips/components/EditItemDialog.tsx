import { useState } from 'react'
import { useApp } from '@/shared/contexts/AppState'
import Modal from '@/shared/components/forms/Modal'
import type { Trip, TripTransaction } from '../api/trips.api'
import { useTagItems } from '../hooks/trips-queries'
import ItemFields, { type ItemDraft } from './ItemFields'

/** Change how one cost counts: category, place, who paid, and whether it is shared. */
export default function EditItemDialog({
  trip,
  row,
  onClose,
}: {
  trip: Trip
  row: TripTransaction
  onClose: () => void
}) {
  const tag = useTagItems()
  const { pushToast } = useApp()
  const [item, setItem] = useState<ItemDraft>({
    category: row.tripCategory ?? 'Other',
    subcategory: row.tripSubcategory ?? '',
    place: row.place ?? '',
    shared: row.shared,
    paidBy: row.paidBy ?? '',
  })

  const save = async () => {
    await tag.mutateAsync({
      id: trip.id,
      items: [
        {
          ref: row.ref,
          kind: 'cost',
          category: item.category,
          subcategory: item.subcategory || null,
          place: item.place || null,
          shared: item.shared,
          ...(row.manual ? { paidBy: item.paidBy || null } : {}),
        },
      ],
    })
    pushToast({ message: 'Cost saved', tone: 'success' })
    onClose()
  }

  return (
    <Modal title={row.recipient || row.description} onClose={onClose}>
      <div className="mt-3 space-y-3">
        <ItemFields trip={trip} value={item} onChange={setItem} manual={row.manual} />
        {tag.error && <p className="text-sm text-expense">{tag.error.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary disabled:opacity-50" disabled={tag.isPending} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
