import { useEffect } from 'react'
import {
  setLearnedMappings,
  setExpenseCategories,
  setArchivedCategories,
  setCategoryStyles,
  setTransactionRules,
} from '@/shared/utils/categorizer'
import { resolveCategories, type CategoryList } from '@/shared/utils/categorizer/categoryList'
import { getLayout, layoutCategories, syncSheetLayout } from '@/shared/utils/sheetLayout'
import { getLearnedMappings, getSheetConfig, saveSheetConfig } from '@/features/settings/api/settings.api'
import { getTransactionRules } from '@/features/settings/api/transactionRules.api'
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
  // `store` is a new object on every render, so effects depend on its stable parts only.
  // Depending on `store` itself re-ran the restore on every render and hammered the API.
  const { commit, replaceRaw, replaceSplits, rawTransactionsRef, splitsRef } = store

  useEffect(() => {
    async function init() {
      const [mappings, rules] = await Promise.all([getLearnedMappings(), getTransactionRules()])

      setTransactionRules(rules)

      if (mappings.length > 0) {
        setLearnedMappings(mappings)
      }
      const saved = getRememberPreference() ? await loadSession() : null

      if (saved && saved.transactions.length > 0) {
        replaceRaw(saved.raw)
        replaceSplits(saved.splits || {})
        commit(migrateOldIds(saved.transactions, saved.raw))
        setAnonymizationEnabled(saved.anonymizationEnabled)
        if (saved.dateRange) {
          setDateRange({ startDate: new Date(saved.dateRange.start), endDate: new Date(saved.dateRange.end) })
        }
      }
      dispatchPhase({ type: 'RESTORE_DONE' })
    }
    init()
  }, [commit, replaceRaw, replaceSplits, setAnonymizationEnabled, setDateRange, dispatchPhase])

  useEffect(() => {
    let cancelled = false

    async function loadSheet() {
      setSheetBootstrap({ kind: 'loading_config' })
      const config = await getSheetConfig()

      if (!config || cancelled) {
        if (!cancelled) {
          setSheetBootstrap({ kind: 'ready' })
        }

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

        if (cancelled) {
          return
        }
        setSheetConfig(synced)
        if (JSON.stringify(synced.layout) !== JSON.stringify(config.layout)) {
          saveSheetConfig(synced)
        }
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
    if (isRestoring || transactions.length === 0 || !remember) {
      return
    }
    const timer = setTimeout(() => {
      saveSession({
        transactions,
        raw: rawTransactionsRef.current,
        dateRange,
        anonymizationEnabled,
        splits: splitsRef.current,
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [transactions, dateRange, anonymizationEnabled, isRestoring, remember, rawTransactionsRef, splitsRef])
}

/** Sets the categories in use: the person's own list, completed from their sheet. Returns the list it settled on. */
export function syncExpenseCategories(sheetConfig: SheetConfig | null, stored: CategoryList | null): CategoryList {
  const list = resolveCategories(layoutCategories(getLayout(sheetConfig)), stored)

  setExpenseCategories(list.active)
  setArchivedCategories(list.archived)
  setCategoryStyles(list.style)

  return list
}
