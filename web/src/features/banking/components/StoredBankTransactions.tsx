import { useEffect } from 'react'
import { useApp } from '@/shared/contexts/AppState'
import { rawKey } from '@/shared/utils/ids'
import { useBankingStatus, useStoredTransactions } from '@/features/banking/hooks/banking-queries'

/** Quietly merges what the server synced in the background into the workspace. Renders nothing. */
export default function StoredBankTransactions() {
  const app = useApp()
  const { data: status } = useBankingStatus()
  const { data } = useStoredTransactions(!!status?.enabled && !app.isRestoring)
  const { importBankTransactions, setTripLinks } = app

  useEffect(() => {
    if (!data) {
      return
    }
    const refByKey = new Map<string, string>()
    const tripKeys = new Map<string, string>()
    // The ref and trip belong to the server's copy; the workspace keeps the plain transaction
    const plain = data.transactions.map(({ ref, tripId, ...tx }) => {
      refByKey.set(rawKey(tx), ref)
      if (tripId) {
        tripKeys.set(rawKey(tx), tripId)
      }

      return tx
    })

    setTripLinks({ refByKey, tripKeys })
    if (plain.length) {
      importBankTransactions(plain, 'Bank sync', true)
    }
    // Only when a fresh copy arrives; the import itself is idempotent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return null
}
