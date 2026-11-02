import { useState } from 'react'
import ConfirmDialog from '@/shared/components/forms/ConfirmDialog'
import { useApp } from '@/shared/contexts/AppState'
import {
  errorMessage,
  useDeleteStoredTransactions,
  useStoredTransactions,
} from '@/features/banking/hooks/banking-queries'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Lets someone erase the copy of their synced transactions the server keeps. A dialog spells out what follows. */
export default function DeleteStoredData() {
  const app = useApp()
  const { data } = useStoredTransactions(true)
  const remove = useDeleteStoredTransactions()
  const [confirming, setConfirming] = useState(false)
  const stored = data?.count ?? 0
  const inTrips = data?.transactions.filter(t => t.tripId).length ?? 0

  const run = async () => {
    try {
      const { deleted } = await remove.mutateAsync()

      app.pushToast({
        message: `Deleted ${plural(deleted, 'stored transaction')}`,
        tone: 'success',
      })
    } catch (e) {
      app.pushToast({
        message: errorMessage(e, "Couldn't delete."),
        tone: 'error',
      })
    }
    setConfirming(false)
  }

  return (
    <section className="card max-sm:p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1 basis-72">
        <h3 className="font-medium text-white">Your data</h3>
        <p className="mt-0.5 text-sm text-white">
          {plural(stored, 'transaction')} stored on FinKit's server
          {inTrips > 0 && <span className="text-midnight-400"> · {inTrips} in trips</span>}
        </p>
        <p className="mt-1 text-sm text-midnight-400">
          A copy so syncs stay up to date. The copy in this browser isn't touched.
        </p>
      </div>
      <button
        className="btn-secondary text-expense disabled:opacity-50 max-sm:w-full"
        disabled={stored === 0}
        onClick={() => setConfirming(true)}
      >
        Delete stored data
      </button>
      {confirming && (
        <ConfirmDialog
          title="Delete stored transactions?"
          description={`This removes ${plural(stored, 'transaction')} from FinKit's server. The next sync fetches them again${
            inTrips > 0
              ? `, and your trips pick their ${plural(inTrips, 'transaction')} back up by themselves. Until then trips show those as no longer stored and their totals drop`
              : ''
          }. To stop syncing for good, disconnect the bank instead.`}
          confirmLabel="Delete stored data"
          busy={remove.isPending}
          onConfirm={run}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}
