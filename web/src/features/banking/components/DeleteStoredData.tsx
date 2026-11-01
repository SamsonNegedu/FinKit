import { useState } from 'react'
import { useApp } from '@/shared/contexts/AppState'
import { errorMessage, useDeleteStoredTransactions } from '@/features/banking/hooks/banking-queries'

/** Lets someone erase the copy of their synced transactions the server keeps. Two steps, so it is never an accident. */
export default function DeleteStoredData() {
  const app = useApp()
  const remove = useDeleteStoredTransactions()
  const [confirming, setConfirming] = useState(false)

  const run = async () => {
    try {
      const { deleted } = await remove.mutateAsync()

      app.pushToast({ message: `Deleted ${deleted} stored transaction${deleted === 1 ? '' : 's'}`, tone: 'success' })
    } catch (e) {
      app.pushToast({ message: errorMessage(e, "Couldn't delete."), tone: 'error' })
    }
    setConfirming(false)
  }

  return (
    <div className="pt-6 border-t border-midnight-800 space-y-2">
      <h3 className="text-sm font-medium text-midnight-300">Stored bank data</h3>
      <p className="text-xs text-midnight-500">
        FinKit keeps your synced transactions on its server so they stay up to date. Deleting them removes that copy,
        not the one in this browser. Future syncs will fetch them again unless you disconnect the bank.
      </p>
      {confirming ? (
        <div className="flex gap-2">
          <button onClick={run} disabled={remove.isPending} className="btn-secondary text-sm text-red-400">
            Yes, delete stored transactions
          </button>
          <button onClick={() => setConfirming(false)} className="btn-secondary text-sm">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="btn-secondary text-sm">
          Delete stored transactions
        </button>
      )}
    </div>
  )
}
