import { useCallback, useMemo, useState } from 'react'
import type { Transaction } from '@/shared/types'
import { linkKey } from '@/shared/utils/ids'

export interface TripLinks {
  /** Server ref of each synced transaction, by the app's own transaction key: what a trip points at */
  refByKey: Map<string, string>
  /** Transactions that belong to a trip, by key, with the trip's id. The money came from a separate balance, so the months leave them out. */
  tripKeys: Map<string, string>
}

const NONE: TripLinks = { refByKey: new Map(), tripKeys: new Map() }

export function useTripLinks(transactions: Transaction[]) {
  const [links, setLinks] = useState<TripLinks>(NONE)
  const setTripLinks = useCallback((next: TripLinks) => setLinks(next), [])
  // The workspace also holds copies saved from earlier syncs, so hiding happens here and not on the server
  const withoutTrips = useMemo(
    () => (links.tripKeys.size ? transactions.filter(t => !links.tripKeys.has(linkKey(t))) : transactions),
    [transactions, links],
  )

  return { tripLinks: links, setTripLinks, withoutTrips }
}
