import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteBudget, deleteCap, listBudgets, saveBudget, saveCap } from '../api/budgets.api'

const key = ['budgets'] as const

export const useBudgets = () => useQuery({ queryKey: key, queryFn: listBudgets, retry: false })

function useRefreshing<A, R>(fn: (arg: A) => Promise<R>) {
  const client = useQueryClient()

  return useMutation({ mutationFn: fn, onSettled: () => client.invalidateQueries({ queryKey: key }) })
}

export const useSaveBudget = () => useRefreshing(saveBudget)
export const useDeleteBudget = () => useRefreshing(deleteBudget)
export const useSaveCap = () => useRefreshing(saveCap)
export const useDeleteCap = () => useRefreshing(deleteCap)
