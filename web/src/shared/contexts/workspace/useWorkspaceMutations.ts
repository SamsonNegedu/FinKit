import type { DateRange, Transaction } from '@/shared/types'
import { merchantKeyOf, sameMerchant } from '@/shared/utils/categorizer'
import { saveAlias } from '@/shared/utils/aliases'
import { transactionsToCsv, downloadCsv } from '@/shared/utils/csv'
import { clearSession } from '@/shared/utils/storage'
import { applySplits, removeSplit, type SplitPart } from '@/shared/utils/splits'
import type { TransactionStore } from './useTransactionStore'
import { useMappingPersistence } from './useMappingPersistence'
import { createRecategorizeMutations } from './useRecategorizeMutations'

type MutationDeps = {
  store: TransactionStore
  pushToast: (t: { message: string; tone: 'success' | 'error'; actionLabel?: string; onAction?: () => void }) => void
  setPendingSaves: React.Dispatch<React.SetStateAction<number>>
  setAnonymizationEnabled: (v: boolean) => void
  setDateRange: (r: DateRange | null) => void
  clearImportError: () => void
  anonymizationEnabled: boolean
  dateRange: DateRange | null
  reprocess: (raw: import('@/shared/types').RawTransaction[], anonymize: boolean) => Transaction[]
}

export function useWorkspaceMutations(deps: MutationDeps) {
  const {
    store,
    pushToast,
    setPendingSaves,
    setAnonymizationEnabled,
    setDateRange,
    clearImportError,
    anonymizationEnabled,
    dateRange,
    reprocess,
  } = deps

  const persistMappings = useMappingPersistence(pushToast, setPendingSaves)
  const { updateTransaction, bulkUpdate } = createRecategorizeMutations(store, pushToast, persistMappings)

  const split = (id: string, parts: SplitPart[]) => {
    const current = store.transactionsRef.current
    const prevSplits = store.splitsRef.current
    const existing = prevSplits[id]
    const target = existing ? existing.parent : current.find(t => t.id === id)
    if (!target) return
    const base = existing ? removeSplit(current, id, target) : current
    store.splitsRef.current = { ...prevSplits, [id]: { parent: target, parts } }
    store.commit(applySplits(base, { [id]: { parent: target, parts } }))
    pushToast({
      message: `Split into ${parts.length} parts`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        store.splitsRef.current = prevSplits
        store.commit(current)
      },
    })
  }

  const unsplit = (parentId: string) => {
    const current = store.transactionsRef.current
    const prevSplits = store.splitsRef.current
    const record = prevSplits[parentId]
    if (!record) return
    const { [parentId]: _removed, ...rest } = prevSplits
    store.splitsRef.current = rest
    store.commit(removeSplit(current, parentId, record.parent))
    pushToast({
      message: 'Split removed',
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        store.splitsRef.current = prevSplits
        store.commit(current)
      },
    })
  }

  const renameMerchant = (merchantKey: string, name: string) => {
    const current = store.transactionsRef.current
    const previousName = current.find(t => sameMerchant(merchantKeyOf(t), merchantKey))?.displayName
    saveAlias(merchantKey, name)
    store.commit(
      current.map(t =>
        sameMerchant(merchantKeyOf(t), merchantKey) ? { ...t, displayName: name.trim() || undefined } : t,
      ),
    )
    pushToast({
      message: name.trim() ? `Showing "${merchantKey}" as ${name.trim()}` : `Reset name for ${merchantKey}`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        saveAlias(merchantKey, previousName ?? null)
        store.commit(current)
      },
    })
  }

  const clearData = () => {
    const snapshot = {
      transactions: store.transactionsRef.current,
      raw: store.rawTransactionsRef.current,
      splits: store.splitsRef.current,
      dateRange,
    }
    store.splitsRef.current = {}
    store.commit([])
    setDateRange(null)
    clearImportError()
    clearSession()
    pushToast({
      message: `Cleared ${snapshot.transactions.length} transactions`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        store.rawTransactionsRef.current = snapshot.raw
        store.splitsRef.current = snapshot.splits
        store.commit(snapshot.transactions)
        setDateRange(snapshot.dateRange)
      },
    })
  }

  const downloadCsvExport = () => {
    downloadCsv(`finkit-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCsv(store.transactionsRef.current))
  }

  const toggleAnonymization = () => {
    const newValue = !anonymizationEnabled
    setAnonymizationEnabled(newValue)
    if (store.rawTransactionsRef.current.length > 0) {
      store.commit(reprocess(store.rawTransactionsRef.current, newValue))
    }
  }

  return {
    updateTransaction,
    bulkUpdate,
    split,
    unsplit,
    renameMerchant,
    clearData,
    downloadCsvExport,
    toggleAnonymization,
    persistMappings,
  }
}
