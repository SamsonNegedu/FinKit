import { useCallback } from 'react'
import type { DateRange, RawTransaction } from '@/shared/types'
import { parseFile } from '@/shared/utils/parser'
import { parseLocalDate } from '@/shared/utils/dates'
import { mergeWithoutDuplicates } from '@/shared/utils/dedupe'
import { applySplits, type SplitMap } from '@/shared/utils/splits'
import type { ImportOptions } from '@/features/import/components/FileUpload'
import { processTransactions } from './processTransactions'
import type { PendingImportPayload } from './workspacePhase'
import type { WorkspacePhaseDispatch } from './useWorkspacePhase'
import type { TransactionStore } from './useTransactionStore'

type ImportDeps = {
  store: TransactionStore
  anonymizationEnabled: boolean
  pushToast: (t: { message: string; tone: 'success' | 'error'; actionLabel?: string; onAction?: () => void }) => void
  dispatchPhase: WorkspacePhaseDispatch
  setDateRange: (r: DateRange | null) => void
}

export function useWorkspaceImport({
  store,
  anonymizationEnabled,
  pushToast,
  dispatchPhase,
  setDateRange,
}: ImportDeps) {
  const reprocess = useCallback(
    (raw: RawTransaction[], anonymize: boolean) => {
      const manual = new Map(
        store.transactionsRef.current.filter(t => t.categorySource === 'manual' && !t.splitOf).map(t => [t.id, t]),
      )
      const excluded = new Map(
        store.transactionsRef.current.filter(t => t.excludedManually && !t.splitOf).map(t => [t.id, t]),
      )
      const processed = processTransactions(raw, anonymize).map(t => {
        const old = manual.get(t.id)
        const keepExcluded = excluded.get(t.id)
        let out = t
        if (old) out = { ...out, category: old.category, categorySource: 'manual' as const }
        if (keepExcluded) out = { ...out, isExcluded: keepExcluded.isExcluded, excludedManually: true }
        return out
      })
      const fresh: SplitMap = {}
      for (const [id, rec] of Object.entries(store.splitsRef.current)) {
        const parent = processed.find(t => t.id === id)
        if (parent) fresh[id] = { ...rec, parent }
      }
      store.splitsRef.current = fresh
      return applySplits(processed, fresh)
    },
    [store],
  )

  const finishAdd = useCallback(
    (incoming: RawTransaction[], keepDuplicates: boolean, label?: string) => {
      const existing = store.rawTransactionsRef.current
      const { merged, added, skipped } = keepDuplicates
        ? { merged: [...existing, ...incoming], added: incoming.length, skipped: 0 }
        : mergeWithoutDuplicates(existing, incoming)
      const previous = store.transactionsRef.current
      const previousRaw = existing
      const previousSplits = store.splitsRef.current
      store.rawTransactionsRef.current = merged
      const next = reprocess(merged, anonymizationEnabled)
      store.commit(next)
      const times = next.map(t => parseLocalDate(t.date).getTime())
      const min = new Date(Math.min(...times))
      const max = new Date(Math.max(...times))
      const end = new Date(max.getFullYear(), max.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      setDateRange({ startDate: new Date(min.getFullYear(), min.getMonth(), 1), endDate: end })
      dispatchPhase({ type: 'IMPORT_DONE' })
      pushToast({
        message: `${label ? `${label}: ` : ''}${added === 0 && skipped > 0 ? 'Nothing new' : `Added ${added} new transaction${added === 1 ? '' : 's'}`}${skipped ? `, ${skipped} already imported` : ''}`,
        tone: 'success',
        actionLabel: 'Undo',
        onAction: () => {
          store.rawTransactionsRef.current = previousRaw
          store.splitsRef.current = previousSplits
          store.commit(previous)
        },
      })
    },
    [anonymizationEnabled, dispatchPhase, pushToast, reprocess, setDateRange, store],
  )

  const uploadFile = async (file: File, options: ImportOptions) => {
    dispatchPhase({ type: 'IMPORT_START' })
    dispatchPhase({ type: 'CLEAR_IMPORT_ERROR' })
    try {
      let rawTransactions = await parseFile(file)
      if (options.dateFilter !== 'all' && options.customStartDate) {
        const startTime = options.customStartDate.getTime()
        const endTime = options.customEndDate?.getTime() || Date.now()
        rawTransactions = rawTransactions.filter(tx => {
          const txTime = parseLocalDate(tx.date).getTime()
          return txTime >= startTime && txTime <= endTime
        })
      }
      store.rawTransactionsRef.current = rawTransactions
      store.splitsRef.current = {}
      const processed = processTransactions(rawTransactions, anonymizationEnabled)
      store.commit(processed)
      if (processed.length > 0) {
        const dates = processed.map(tx => parseLocalDate(tx.date).getTime())
        const minDate = new Date(Math.min(...dates))
        const maxDate = new Date(Math.max(...dates))
        const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)
        setDateRange({
          startDate: new Date(minDate.getFullYear(), minDate.getMonth(), 1),
          endDate,
        })
      }
      dispatchPhase({ type: 'IMPORT_DONE' })
    } catch (err) {
      dispatchPhase({
        type: 'IMPORT_FAIL',
        message: err instanceof Error ? err.message : 'Failed to parse file',
      })
    }
  }

  const addFile = async (file: File) => {
    try {
      const incoming = await parseFile(file)
      const { skipped } = mergeWithoutDuplicates(store.rawTransactionsRef.current, incoming)
      if (skipped > 0) {
        const pending: PendingImportPayload = { incoming, duplicates: skipped, fileName: file.name }
        dispatchPhase({ type: 'DUPLICATE_PROMPT', pending })
      } else {
        finishAdd(incoming, false)
      }
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Failed to read file', tone: 'error' })
    }
  }

  const importBankTransactions = (incoming: RawTransaction[], bankName: string) => finishAdd(incoming, false, bankName)

  const resolvePendingImport = (mode: 'skip' | 'keep' | 'cancel', pending: PendingImportPayload | null) => {
    if (!pending) return
    if (mode === 'cancel') {
      dispatchPhase({ type: 'DUPLICATE_RESOLVED' })
      return
    }
    finishAdd(pending.incoming, mode === 'keep')
  }

  return {
    uploadFile,
    addFile,
    importBankTransactions,
    resolvePendingImport,
    reprocess,
  }
}
