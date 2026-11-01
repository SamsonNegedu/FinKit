import { useApp } from '../../app/AppState'
import { BankConnection } from '../../lib/banking'
import {
  errorMessage,
  useAgeConnection,
  useDisconnectBank,
  useStartConnect,
  useSyncConnection,
} from '../../lib/banking-queries'

/** What you can do with a bank connection, with success and failure reported the same way on every page. */
export function useConnectionActions() {
  const app = useApp()
  const syncMutation = useSyncConnection()
  const disconnectMutation = useDisconnectBank()
  const connectMutation = useStartConnect()
  const ageMutation = useAgeConnection()

  return {
    /** The connection that is syncing right now, so its card can show progress. */
    syncingId: syncMutation.isPending ? syncMutation.variables?.id : undefined,
    busyId: disconnectMutation.isPending ? disconnectMutation.variables : undefined,

    async sync(connection: BankConnection, from?: string) {
      try {
        const result = await syncMutation.mutateAsync({ id: connection.id, from })
        app.importBankTransactions(result.transactions, connection.bank)
      } catch (e) {
        app.pushToast({ message: errorMessage(e, "Couldn't sync."), tone: 'error' })
      }
    },

    reconnect(connection: BankConnection) {
      connectMutation.mutate(
        { bank: connection.bank, country: connection.country, reconnect: connection.id },
        { onError: e => app.pushToast({ message: errorMessage(e, "Couldn't start the connection."), tone: 'error' }) },
      )
    },

    async disconnect(connection: BankConnection): Promise<boolean> {
      try {
        await disconnectMutation.mutateAsync(connection.id)
        app.pushToast({ message: `${connection.bank} disconnected`, tone: 'success' })
        return true
      } catch (e) {
        app.pushToast({ message: errorMessage(e, "Couldn't disconnect."), tone: 'error' })
        return false
      }
    },

    age(connection: BankConnection, mode: 'expiring' | 'expired') {
      ageMutation.mutate({ id: connection.id, mode })
    },
  }
}
