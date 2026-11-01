import { useEffect } from 'react'
import { setLearnedMappings, setExpenseCategories } from '@/shared/utils/categorizer'
import { getLayout, layoutCategories, syncSheetLayout } from '@/shared/utils/sheetLayout'
import { getLearnedMappings, getSheetConfig, saveSheetConfig } from '@/features/settings/api/settings.api'
import { getRememberPreference, loadSession, saveSession } from '@/shared/utils/storage'
import { migrateOldIds } from '@/shared/utils/ids'
import type { DateRange, SheetConfig, Transaction } from '@/shared/types'
import type { SheetBootstrapPhase } from './workspacePhase'
import type { WorkspacePhaseDispatch } from './useWorkspacePhase'
import type { TransactionStore } from './useTransactionStore'

type BootstrapArgs = {
  store: TransactionStore
  dispatchPhase: WorkspacePhaseDispatch
  setAnonymizationEnabled: (v: boolean) => void
  setDateRange: (r: DateRange | null) => void
  setSheetConfig: (c: SheetConfig | null) => void
  setSheetBootstrap: (p: SheetBootstrapPhase) => void
  remember: boolean
  isRestoring: boolean
  dateRange: DateRange | null
  anonymizationEnabled: boolean
  transactions: Transaction[]
}

export function useWorkspaceBootstrap({
  store,
  dispatchPhase,
  setAnonymizationEnabled,
  setDateRange,
  setSheetConfig,
  setSheetBootstrap,
  remember,
  isRestoring,
  dateRange,
  anonymizationEnabled,
  transactions,
}: BootstrapArgs) {
  useEffect(() => {
    async function init() {
      const mappings = await getLearnedMappings()
      if (mappings.length > 0) setLearnedMappings(mappings)
      const saved = getRememberPreference() ? await loadSession() : null
      if (saved && saved.transactions.length > 0) {
        store.rawTransactionsRef.current = saved.raw
        store.splitsRef.current = saved.splits || {}
        store.commit(migrateOldIds(saved.transactions, saved.raw))
        setAnonymizationEnabled(saved.anonymizationEnabled)
        if (saved.dateRange) {
          setDateRange({ startDate: new Date(saved.dateRange.start), endDate: new Date(saved.dateRange.end) })
        }
      }
      dispatchPhase({ type: 'RESTORE_DONE' })
    }
    init()
  }, [store, setAnonymizationEnabled, setDateRange, dispatchPhase])

  useEffect(() => {
    let cancelled = false
    async function loadSheet() {
      setSheetBootstrap({ kind: 'loading_config' })
      const config = await getSheetConfig()
      if (!config || cancelled) {
        if (!cancelled) setSheetBootstrap({ kind: 'ready' })
        return
      }
      setSheetConfig(config)
      if (!config.sheetId || !config.headerRow) {
        setSheetBootstrap({ kind: 'ready' })
        return
      }
      setSheetBootstrap({ kind: 'syncing_layout' })
      try {
        const synced = await syncSheetLayout(config)
        if (cancelled) return
        setSheetConfig(synced)
        if (JSON.stringify(synced.layout) !== JSON.stringify(config.layout)) saveSheetConfig(synced)
        setSheetBootstrap({ kind: 'ready' })
      } catch (e) {
        if (!cancelled) {
          setSheetBootstrap({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Failed to sync sheet layout',
          })
        }
      }
    }
    loadSheet()
    return () => {
      cancelled = true
    }
  }, [setSheetConfig, setSheetBootstrap])

  useEffect(() => {
    if (isRestoring || transactions.length === 0 || !remember) return
    const timer = setTimeout(() => {
      saveSession({
        transactions,
        raw: store.rawTransactionsRef.current,
        dateRange,
        anonymizationEnabled,
        splits: store.splitsRef.current,
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [transactions, dateRange, anonymizationEnabled, isRestoring, remember, store])
}

export function syncExpenseCategoriesFromSheet(sheetConfig: SheetConfig | null) {
  setExpenseCategories(layoutCategories(getLayout(sheetConfig)))
}
