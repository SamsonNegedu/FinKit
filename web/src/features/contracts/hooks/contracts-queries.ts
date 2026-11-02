import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContract,
  deleteContract,
  listContracts,
  listPayments,
  updateContract,
  type ContractChanges,
  type NewContract,
} from '../api/contracts.api'

const key = ['contracts'] as const

export const useContractPayments = (id: string, enabled: boolean) =>
  useQuery({ queryKey: [...key, id, 'payments'], queryFn: () => listPayments(id), enabled, retry: false })

export const useContracts = (enabled = true) =>
  useQuery({ queryKey: key, queryFn: listContracts, retry: false, enabled })

function useRefreshing<A, R>(fn: (arg: A) => Promise<R>) {
  const client = useQueryClient()

  return useMutation({ mutationFn: fn, onSettled: () => client.invalidateQueries({ queryKey: key }) })
}

export const useCreateContract = () => useRefreshing((input: NewContract) => createContract(input))
export const useUpdateContract = () =>
  useRefreshing(({ id, changes }: { id: string; changes: ContractChanges }) => updateContract(id, changes))
export const useDeleteContract = () => useRefreshing((id: string) => deleteContract(id))
