import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ImportConfirm from '@/features/import/components/ImportConfirm'
import ToastHost from '@/shared/components/feedback/Toast'
import type { DateRange, SheetConfig } from '@/shared/types'
import {
  applyRates,
  baseCurrencyOf,
  foreignCurrenciesOf,
  loadRateStore,
  saveRateStore,
  type RateMap,
  type RateStore,
} from '@/shared/utils/rates'
import { getNumberFormat, setNumberFormat, type NumberFormat } from '@/shared/utils/format'
import { useSaveCategories, useStoredCategories } from '@/features/settings/hooks/category-queries'
import { withDetail } from '@/shared/utils/categorizer/categoryList'
import type { AppState } from './workspace/types'
import { useToastStack } from './workspace/useToastStack'
import { useTransactionStore } from './workspace/useTransactionStore'
import { syncExpenseCategories, useWorkspaceBootstrap } from './workspace/useWorkspaceBootstrap'
import { useWorkspaceImport } from './workspace/useWorkspaceImport'
import { useWorkspaceMutations } from './workspace/useWorkspaceMutations'
import { useTripLinks } from './workspace/useTripLinks'
import { useRememberPreference } from './workspace/useRememberPreference'
import { useWorkspacePhase } from './workspace/useWorkspacePhase'
import { useSheetBootstrapPhase } from './workspace/useSheetBootstrapPhase'
import {
  importErrorFromPhase,
  isImportingPhase,
  isRestoringPhase,
  isSheetBootstrapPending,
  pendingImportFromPhase,
  sheetBootstrapErrorMessage,
} from './workspace/workspacePhase'

const AppContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const store = useTransactionStore()
  const { toasts, dismissToast, pushToast } = useToastStack()
  const [workspacePhase, dispatchPhase] = useWorkspacePhase()
  const [sheetBootstrapPhase, dispatchSheetBootstrap] = useSheetBootstrapPhase()
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null)
  const [anonymizationEnabled, setAnonymizationEnabled] = useState(false)
  const [pendingSaves, setPendingSaves] = useState(0)
  const [rateStore, setRateStore] = useState<RateStore>(loadRateStore())
  const [numberFormat, setNumberFormatState] = useState<NumberFormat>(getNumberFormat())
  const { remember, toggleRemember } = useRememberPreference(pushToast)

  const isRestoring = isRestoringPhase(workspacePhase)
  const isLoading = isImportingPhase(workspacePhase)
  const error = importErrorFromPhase(workspacePhase)
  const pendingImport = pendingImportFromPhase(workspacePhase)
  const sheetBootstrapPending = isSheetBootstrapPending(sheetBootstrapPhase)
  const sheetBootstrapError = sheetBootstrapErrorMessage(sheetBootstrapPhase)
  const bootstrapErrorAnnounced = useRef<string | null>(null)

  useEffect(() => {
    if (!sheetBootstrapError || sheetBootstrapError === bootstrapErrorAnnounced.current) {
      return
    }
    bootstrapErrorAnnounced.current = sheetBootstrapError
    pushToast({
      message: `Google Sheet: ${sheetBootstrapError}`,
      tone: 'error',
      actionLabel: 'Dismiss',
      onAction: () => dispatchSheetBootstrap({ type: 'DISMISS_ERROR' }),
    })
  }, [sheetBootstrapError, pushToast, dispatchSheetBootstrap])

  useWorkspaceBootstrap({
    store,
    dispatchPhase,
    setAnonymizationEnabled,
    setDateRange,
    setSheetConfig,
    dispatchSheetBootstrap,
    remember,
    isRestoring,
    dateRange,
    anonymizationEnabled,
    transactions: store.transactions,
  })

  const { data: storedCategories = null } = useStoredCategories()
  const categoryList = syncExpenseCategories(sheetConfig, storedCategories)
  const saveCategories = useSaveCategories()
  const addCategoryDetail = (category: string, name: string) => {
    const next = withDetail(categoryList, category, name)

    if (next !== categoryList) {
      saveCategories.mutate(next)
    }
  }

  const clearImportError = () => dispatchPhase({ type: 'CLEAR_IMPORT_ERROR' })

  const importActions = useWorkspaceImport({
    store,
    anonymizationEnabled,
    pushToast,
    dispatchPhase,
    setDateRange,
  })

  // A saved session holds rows categorized and named by whatever rules existed when it was saved. Run the
  // current rules over the raw rows once on restore, or a rule fix never reaches rows that were synced earlier.
  const reprocessedOnRestore = useRef(false)
  const { reprocess } = importActions

  useEffect(() => {
    if (isRestoring || reprocessedOnRestore.current) {
      return
    }
    reprocessedOnRestore.current = true
    if (store.rawTransactionsRef.current.length > 0) {
      store.commit(reprocess(store.rawTransactionsRef.current, anonymizationEnabled))
    }
  }, [isRestoring, anonymizationEnabled, reprocess, store])

  const mutations = useWorkspaceMutations({
    store,
    pushToast,
    setPendingSaves,
    setAnonymizationEnabled,
    setDateRange,
    clearImportError,
    anonymizationEnabled,
    dateRange,
    reprocess: importActions.reprocess,
  })

  const { tripLinks, setTripLinks, withoutTrips } = useTripLinks(store.transactions)
  const baseCurrency = useMemo(() => baseCurrencyOf(store.transactions), [store.transactions])
  const foreignCurrencies = useMemo(
    () => foreignCurrenciesOf(store.transactions, baseCurrency),
    [store.transactions, baseCurrency],
  )
  const rates = useMemo<RateMap>(() => rateStore[baseCurrency] ?? {}, [rateStore, baseCurrency])
  const displayTransactions = useMemo(
    () => applyRates(withoutTrips, baseCurrency, rates),
    [withoutTrips, baseCurrency, rates],
  )

  const toggleNumberFormat = () => {
    const next: NumberFormat = numberFormat === 'point' ? 'comma' : 'point'

    setNumberFormat(next)
    setNumberFormatState(next)
  }

  const value: AppState = {
    transactions: store.transactions,
    displayTransactions,
    tripLinks,
    setTripLinks,
    baseCurrency,
    foreignCurrencies,
    rates,
    onRatesChange: next => {
      const updated = { ...rateStore, [baseCurrency]: next }

      setRateStore(updated)
      saveRateStore(updated)
    },
    dateRange,
    setDateRange,
    sheetConfig,
    setSheetConfig,
    categoryList,
    addCategoryDetail,
    isLoading,
    isRestoring,
    error,
    workspacePhase,
    sheetBootstrapPhase,
    sheetBootstrapPending,
    sheetBootstrapError,
    dismissSheetBootstrapError: () => dispatchSheetBootstrap({ type: 'DISMISS_ERROR' }),
    anonymizationEnabled,
    toggleAnonymization: mutations.toggleAnonymization,
    uploadFile: importActions.uploadFile,
    addFile: importActions.addFile,
    importBankTransactions: importActions.importBankTransactions,
    clearData: mutations.clearData,
    downloadCsv: mutations.downloadCsvExport,
    updateTransaction: mutations.updateTransaction,
    bulkUpdate: mutations.bulkUpdate,
    makeRule: mutations.makeRule,
    split: mutations.split,
    unsplit: mutations.unsplit,
    renameMerchant: mutations.renameMerchant,
    remember,
    toggleRemember,
    numberFormat,
    toggleNumberFormat,
    pendingSaves,
    pushToast,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      {pendingImport && (
        <ImportConfirm
          fileName={pendingImport.fileName}
          total={pendingImport.incoming.length}
          duplicates={pendingImport.duplicates}
          onSkip={() => importActions.resolvePendingImport('skip', pendingImport)}
          onKeepAll={() => importActions.resolvePendingImport('keep', pendingImport)}
          onCancel={() => importActions.resolvePendingImport('cancel', pendingImport)}
        />
      )}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  )
}

export function useApp(): AppState {
  const value = useContext(AppContext)

  if (!value) {
    throw new Error('useApp must be used inside AppStateProvider')
  }

  return value
}
