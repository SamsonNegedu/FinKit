import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Archive } from 'lucide-react'
import ConfirmDialog from '@/shared/components/forms/ConfirmDialog'
import { useApp } from '@/shared/contexts/AppState'
import type { Trip } from '../api/trips.api'
import { useDeleteTrip, useUpdateTrip } from '../hooks/trips-queries'
import TripFields, { draftOf, isTripDraftValid, tripPayload } from './TripFields'

/** A titled section, set off by a line. An action goes on the right of the heading, so buttons line up down the page. */
const Section = ({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint?: string
  action?: ReactNode
  children?: ReactNode
}) => (
  <section className="space-y-3 border-t border-midnight-700 pt-6 first:border-t-0 first:pt-0">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1 basis-64">
        <h3 className="font-medium text-white">{title}</h3>
        {hint && <p className="mt-0.5 text-sm text-midnight-400">{hint}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
)

/** Everything about the trip itself, kept out of the way: its details, archive and delete. */
export default function TripManage({ trip }: { trip: Trip }) {
  const { baseCurrency, pushToast } = useApp()
  const navigate = useNavigate()
  const update = useUpdateTrip()
  const remove = useDeleteTrip()
  const [draft, setDraft] = useState(() => draftOf(trip))
  const [confirming, setConfirming] = useState(false)
  const currency = trip.budgetCurrency ?? baseCurrency
  const changed = JSON.stringify(draft) !== JSON.stringify(draftOf(trip))

  const confirmDelete = async () => {
    await remove.mutateAsync(trip.id)
    pushToast({ message: `Deleted ${trip.name}`, tone: 'success' })
    navigate({ to: '/trips' })
  }

  return (
    <>
      <Section title="Details">
        <TripFields draft={draft} onChange={setDraft} currency={currency} />
        {update.error && <p className="text-sm text-expense">{update.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button
            className="btn-secondary disabled:opacity-50"
            disabled={!changed}
            onClick={() => setDraft(draftOf(trip))}
          >
            Reset
          </button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={!changed || !isTripDraftValid(draft) || update.isPending}
            onClick={() =>
              update.mutate(
                { id: trip.id, ...tripPayload(draft, currency) },
                { onSuccess: () => pushToast({ message: 'Trip saved', tone: 'success' }) },
              )
            }
          >
            Save
          </button>
        </div>
      </Section>
      <Section
        title={trip.archived ? 'Archived' : 'Archive'}
        hint={
          trip.archived
            ? 'This trip is hidden from the list of active trips. Its transactions stay out of your months.'
            : 'Finished with this trip? Archiving hides it from new transactions. Nothing is deleted.'
        }
        action={
          <button
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() =>
              update.mutate(
                { id: trip.id, archived: !trip.archived },
                {
                  onSuccess: () =>
                    pushToast({ message: trip.archived ? 'Trip brought back' : 'Trip archived', tone: 'success' }),
                },
              )
            }
          >
            <Archive className="h-4 w-4" /> {trip.archived ? 'Bring back' : 'Archive trip'}
          </button>
        }
      />
      <Section
        title="Delete trip"
        hint="Synced transactions go back to their months. Costs you added by hand are deleted."
        action={
          <button className="btn-secondary text-expense" onClick={() => setConfirming(true)}>
            Delete trip
          </button>
        }
      />
      {confirming && (
        <ConfirmDialog
          title={`Delete "${trip.name}"?`}
          description="Synced transactions go back to their months. Costs you added by hand are deleted."
          confirmLabel="Delete trip"
          busy={remove.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}
