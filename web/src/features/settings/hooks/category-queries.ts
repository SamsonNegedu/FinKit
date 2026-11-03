import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCategoryList, saveCategoryList, type CategoryList } from '../api/settings.api'

const key = ['settings', 'categories'] as const

/** The person's saved category list; null until they have one. */
export const useStoredCategories = () =>
  useQuery({ queryKey: key, queryFn: getCategoryList, staleTime: Infinity, retry: false })

export function useSaveCategories() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (list: CategoryList) => saveCategoryList(list),
    onSuccess: list => client.setQueryData(key, list),
  })
}
