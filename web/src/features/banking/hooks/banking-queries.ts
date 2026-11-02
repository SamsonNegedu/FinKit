import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BankingError,
  adminAudit,
  adminExpire,
  adminOverview,
  adminSyncLog,
  disconnectBank,
  getBankingStatus,
  listBanks,
  listConnections,
  startConnect,
  deleteStoredTransactions,
  listBalances,
  storedTransactions,
  syncConnection,
} from '../api/banking.api'
import { BANKING_BANK_LIST_STALE_MS, BANKING_STATUS_STALE_MS } from '../constants'

// Query keys in one place, so a change to connections refreshes everything that shows them
const bankingKeys = {
  all: ['banking'] as const,
  status: ['banking', 'status'] as const,
  connections: ['banking', 'connections'] as const,
  banks: (country: string) => ['banking', 'banks', country] as const,
  overview: ['banking', 'admin', 'overview'] as const,
  syncLog: ['banking', 'admin', 'sync-log'] as const,
  audit: ['banking', 'admin', 'audit'] as const,
}

// Off, unreachable and not-signed-in all look the same to the app: banking is simply not shown
export const statusQuery = queryOptions({
  queryKey: bankingKeys.status,
  queryFn: getBankingStatus,
  staleTime: 60_000,
  retry: false,
})
const connectionsQuery = queryOptions({
  queryKey: bankingKeys.connections,
  queryFn: listConnections,
  staleTime: BANKING_STATUS_STALE_MS,
})
const banksQuery = (country = 'DE') =>
  queryOptions({
    queryKey: bankingKeys.banks(country),
    queryFn: () => listBanks(country),
    staleTime: BANKING_BANK_LIST_STALE_MS,
    retry: 1,
  })

export function useBankingStatus() {
  return useQuery(statusQuery)
}

export function useConnections() {
  const { data: status } = useBankingStatus()

  return useQuery({ ...connectionsQuery, enabled: !!status?.enabled })
}

export function useBanks(country = 'DE') {
  return useQuery(banksQuery(country))
}

export const useAdminOverview = () =>
  useQuery({
    queryKey: bankingKeys.overview,
    queryFn: adminOverview,
    retry: false,
  })
export const useAdminSyncLog = () =>
  useQuery({
    queryKey: bankingKeys.syncLog,
    queryFn: adminSyncLog,
    retry: false,
  })
export const useAdminAudit = () => useQuery({ queryKey: bankingKeys.audit, queryFn: adminAudit, retry: false })

export function useSyncConnection() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, from }: { id: string; from?: string }) => syncConnection(id, from ? { from } : {}),
    // Whether it worked or not, the card's "last sync" and status may have changed
    onSettled: () => client.invalidateQueries({ queryKey: bankingKeys.all }),
  })
}

export function useDisconnectBank() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => disconnectBank(id),
    onSettled: () => client.invalidateQueries({ queryKey: bankingKeys.all }),
  })
}

export function useAgeConnection() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: 'expiring' | 'expired' }) => adminExpire(id, mode),
    onSettled: () => client.invalidateQueries({ queryKey: bankingKeys.all }),
  })
}

/** Starts connecting (or reconnecting) a bank, then hands the browser over to the bank's own page. */
export function useStartConnect() {
  return useMutation({
    mutationFn: async ({ bank, country = 'DE', reconnect }: { bank: string; country?: string; reconnect?: string }) => {
      const url = await startConnect(bank, country, reconnect)

      window.location.href = url
    },
  })
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof BankingError || error instanceof Error ? error.message : fallback
}

export function useBalances(enabled: boolean) {
  return useQuery({
    queryKey: [...bankingKeys.all, 'balances'],
    queryFn: listBalances,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** The server's copy of this person's synced transactions; refetched when the tab regains focus. */
export function useStoredTransactions(enabled: boolean) {
  return useQuery({
    queryKey: [...bankingKeys.all, 'stored'],
    queryFn: storedTransactions,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useDeleteStoredTransactions() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: deleteStoredTransactions,
    onSettled: () => client.invalidateQueries({ queryKey: bankingKeys.all }),
  })
}
