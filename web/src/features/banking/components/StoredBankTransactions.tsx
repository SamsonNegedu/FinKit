import { useEffect } from 'react'
import { useApp } from '@/shared/contexts/AppState'
import { useBankingStatus, useStoredTransactions } from '@/features/banking/hooks/banking-queries'

/** Quietly merges what the server synced in the background into the workspace. Renders nothing. */
export default function StoredBankTransactions() {
  const app = useApp()
  const { data: status } = useBankingStatus()
  const { data } = useStoredTransactions(!!status?.enabled && !app.isRestoring)
  const { importBankTransactions } = app

  useEffect(() => {
    if (data?.transactions.length) {
      importBankTransactions(data.transactions, 'Bank sync', true)
    }
    // Only when a fresh copy arrives; the import itself is idempotent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return null
}
