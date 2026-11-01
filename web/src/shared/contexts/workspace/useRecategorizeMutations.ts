import type { Transaction } from '@/shared/types'
import { setLocalLearnedMapping } from '@/shared/utils/categorizer'
import { recategorize as applyRecategorize } from '@/shared/utils/recategorize'
import { deleteLearnedMapping } from '@/features/settings/api/settings.api'
import type { MappingChange } from './types'
import { withEdit } from './types'
import type { TransactionStore } from './useTransactionStore'

type ToastPush = (t: {
  message: string
  tone: 'success' | 'error'
  actionLabel?: string
  onAction?: () => void
}) => void

export function createRecategorizeMutations(
  store: TransactionStore,
  pushToast: ToastPush,
  persistMappings: (changes: MappingChange[]) => void,
) {
  const recategorize = (ids: string[], category: string, extra: Partial<Transaction> = {}) => {
    const current = store.transactionsRef.current
    const result = applyRecategorize(current, ids, category, extra)

    if (!result) {
      return
    }
    const previousMappings = result.merchants.map(m => ({
      merchant: m,
      previous: setLocalLearnedMapping(m, category),
    }))

    persistMappings(result.merchants.map(m => ({ merchant: m, category })))
    store.commit(result.next)
    const label = result.merchants.length === 1 ? result.merchants[0] : `${result.targetCount} transactions`
    const others = result.siblingCount > 0 ? ` · also updated ${result.siblingCount} similar` : ''

    pushToast({
      message: `${label} → ${category}${others}`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        store.commit(current)
        const restore: MappingChange[] = []

        for (const { merchant, previous } of previousMappings) {
          setLocalLearnedMapping(merchant, previous)
          if (previous) {
            restore.push({ merchant, category: previous })
          } else {
            deleteLearnedMapping(merchant)
          }
        }
        persistMappings(restore)
      },
    })
  }

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    const { category, ...rest } = updates
    const current = store.transactionsRef.current
    const existing = current.find(t => t.id === id)

    if (!existing) {
      return
    }
    if (category && category !== existing.category) {
      recategorize([id], category, 'isExcluded' in rest ? { ...rest, excludedManually: true } : rest)

      return
    }
    store.commit(current.map(t => (t.id === id ? withEdit(t, updates) : t)))
    if ('isExcluded' in updates) {
      pushToast({
        message: updates.isExcluded ? 'Excluded from totals' : 'Included in totals',
        tone: 'success',
        actionLabel: 'Undo',
        onAction: () => store.commit(current),
      })
    }
  }

  const bulkUpdate = (ids: string[], updates: Partial<Transaction>) => {
    const { category, ...rest } = updates

    if (category) {
      recategorize(ids, category, 'isExcluded' in rest ? { ...rest, excludedManually: true } : rest)

      return
    }
    const current = store.transactionsRef.current
    const idSet = new Set(ids)

    store.commit(current.map(t => (idSet.has(t.id) ? withEdit(t, updates) : t)))
    pushToast({
      message: `${updates.isExcluded ? 'Excluded' : 'Included'} ${ids.length} transactions`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => store.commit(current),
    })
  }

  return { recategorize, updateTransaction, bulkUpdate }
}
