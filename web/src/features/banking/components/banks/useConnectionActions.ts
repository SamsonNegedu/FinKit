import { useApp } from '@/shared/contexts/AppState'
import { BankConnection } from '@/features/banking/api/banking.api'
import {
  errorMessage,
  useAgeConnection,
  useDisconnectBank,
  useStartConnect,
  useSyncConnection,
} from '@/features/banking/hooks/banking-queries'
import { connectionOperationFromMutations, isConnectionBusy } from '@/features/banking/bankingUiPhase'

/** What you can do with a bank connection, with success and failure reported the same way on every page. */
export function useConnectionActions() {
  const app = useApp()
  const syncMutation = useSyncConnection()
  const disconnectMutation = useDisconnectBank()
  const connectMutation = useStartConnect()
  const ageMutation = useAgeConnection()

  const operation = connectionOperationFromMutations({
    syncPending: syncMutation.isPending,
    syncId: syncMutation.variables?.id,
    disconnectPending: disconnectMutation.isPending,
    disconnectId: disconnectMutation.variables,
    connectPending: connectMutation.isPending,
  })

  return {
    operation,
    syncingId: operation.kind === 'sync' ? operation.connectionId : undefined,
    busyId: operation.kind === 'disconnect' ? operation.connectionId : undefined,
    isConnectionBusy: (connectionId: string) => isConnectionBusy(operation, connectionId),

    async sync(connection: BankConnection, from?: string) {
      try {
        const result = await syncMutation.mutateAsync({
          id: connection.id,
          from,
        })

        app.importBankTransactions(result.transactions, connection.bank)
      } catch (e) {
        app.pushToast({
          message: errorMessage(e, "Couldn't sync."),
          tone: 'error',
        })
      }
    },

    reconnect(connection: BankConnection) {
      connectMutation.mutate(
        {
          bank: connection.bank,
          country: connection.country,
          reconnect: connection.id,
        },
        {
          onError: e =>
            app.pushToast({
              message: errorMessage(e, "Couldn't start the connection."),
              tone: 'error',
            }),
        },
      )
    },

    async disconnect(connection: BankConnection): Promise<boolean> {
      try {
        await disconnectMutation.mutateAsync(connection.id)
        app.pushToast({
          message: `${connection.bank} disconnected`,
          tone: 'success',
        })

        return true
      } catch (e) {
        app.pushToast({
          message: errorMessage(e, "Couldn't disconnect."),
          tone: 'error',
        })

        return false
      }
    },

    age(connection: BankConnection, mode: 'expiring' | 'expired') {
      ageMutation.mutate({ id: connection.id, mode })
    },
  }
}
