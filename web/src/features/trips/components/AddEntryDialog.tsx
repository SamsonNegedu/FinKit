import { useState } from 'react'
import DatePicker from '@/shared/components/forms/DatePicker'
import Modal from '@/shared/components/forms/Modal'
import { useApp } from '@/shared/contexts/AppState'
import { toISODate } from '@/shared/utils/dates'
import type { Trip } from '../api/trips.api'
import { useAddEntry } from '../hooks/trips-queries'
import ItemFields, { type ItemDraft } from './ItemFields'

/** A cost with no bank transaction behind it: cash, or paid from a balance FinKit doesn't see. */
export default function AddEntryDialog({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { baseCurrency, pushToast } = useApp()
  const add = useAddEntry()
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(baseCurrency)
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [item, setItem] = useState<ItemDraft>({
    category: 'Other',
    subcategory: '',
    place: '',
    shared: false,
    paidBy: '',
  })
  const [error, setError] = useState<string | null>(null)
  const valid = note.trim() !== '' && Number(amount) > 0 && /^[A-Za-z]{3}$/.test(currency) && date !== ''

  const save = async () => {
    setError(null)
    try {
      await add.mutateAsync({
        id: trip.id,
        entry: {
          date,
          amount: Number(amount),
          currency: currency.toUpperCase(),
          note: note.trim(),
          category: item.category,
          subcategory: item.subcategory || null,
          place: item.place || null,
          shared: item.shared,
          paidBy: item.paidBy || null,
        },
      })
      pushToast({ message: 'Cost added', tone: 'success' })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  return (
    <Modal title="Add a cost" onClose={onClose}>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-midnight-400">For cash or anything paid outside your synced accounts.</p>
        <label className="block text-sm text-midnight-300">
          What was it
          <input
            className="input mt-1 w-full"
            value={note}
            maxLength={80}
            placeholder="Dinner, taxi, market"
            onChange={e => setNote(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-[1fr,6rem] gap-3">
          <label className="text-sm text-midnight-300">
            Amount
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className="input mt-1 w-full"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </label>
          <label className="text-sm text-midnight-300">
            Currency
            <input
              className="input mt-1 w-full uppercase"
              value={currency}
              maxLength={3}
              onChange={e => setCurrency(e.target.value)}
            />
          </label>
        </div>
        <div className="text-sm text-midnight-300">
          Date
          <div className="mt-1">
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>
        <ItemFields trip={trip} value={item} onChange={setItem} manual />
        {error && <p className="text-sm text-expense">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary disabled:opacity-50" disabled={!valid || add.isPending} onClick={save}>
            Add
          </button>
        </div>
      </div>
    </Modal>
  )
}
