import { useState } from 'react'
import { Transaction } from '@/shared/types'

/** Which rows are ticked, and what the bulk actions do to them. */
export function useSelection(
  visible: Transaction[],
  bulkUpdate: (ids: string[], updates: Partial<Transaction>) => void,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const apply = (updates: Partial<Transaction>) => {
    bulkUpdate([...selectedIds], updates)
    setSelectedIds(new Set())
  }

  return {
    selectedIds,
    setSelectedIds,
    selectAll: () =>
      setSelectedIds(prev => (prev.size === visible.length ? new Set() : new Set(visible.map(t => t.id)))),
    setCategory: (category: string, detail?: string) => apply({ category, categoryDetail: detail || undefined }),
    exclude: () => apply({ isExcluded: true }),
    include: () => apply({ isExcluded: false }),
  }
}
