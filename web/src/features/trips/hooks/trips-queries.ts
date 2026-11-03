import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addEntry,
  addTripCategory,
  createTrip,
  deleteTrip,
  getTrip,
  listTripCategories,
  listTrips,
  tagItems,
  untagItems,
  updateTrip,
  type EntryInput,
  type TagItem,
  type TripInput,
} from '../api/trips.api'

const keys = { all: ['trips'] as const, categories: ['trips', 'categories'] as const }

export const useTrips = (enabled = true) => useQuery({ queryKey: keys.all, queryFn: listTrips, enabled, retry: false })
export const useTrip = (id: string) => useQuery({ queryKey: [...keys.all, id], queryFn: () => getTrip(id) })
export const useTripCategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: listTripCategories, select: d => d.categories })
export const useTripSubcategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: listTripCategories, select: d => d.subcategories })

/**
 * A change to a trip also changes which synced transactions the months show, so the server's list
 * of transactions (kept by the banking feature under the "banking" key) is refreshed as well.
 */
function useRefreshing<A, R>(fn: (arg: A) => Promise<R>) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: fn,
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: keys.all }),
        client.invalidateQueries({ queryKey: ['banking'] }),
      ]),
  })
}

export const useCreateTrip = () => useRefreshing((input: TripInput) => createTrip(input))
export const useUpdateTrip = () =>
  useRefreshing(({ id, ...input }: { id: string } & Partial<TripInput>) => updateTrip(id, input))
export const useDeleteTrip = () => useRefreshing((id: string) => deleteTrip(id))
export const useTagItems = () => useRefreshing(({ id, items }: { id: string; items: TagItem[] }) => tagItems(id, items))
export const useUntagItems = () => useRefreshing(({ id, refs }: { id: string; refs: string[] }) => untagItems(id, refs))
export const useAddTripCategory = () => useRefreshing((name: string) => addTripCategory(name))
export const useAddEntry = () =>
  useRefreshing(({ id, entry }: { id: string; entry: EntryInput }) => addEntry(id, entry))
