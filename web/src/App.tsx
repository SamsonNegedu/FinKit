import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Transaction, DateRange, SheetConfig, RawTransaction } from './types'
import Dashboard from './components/Dashboard'
import FileUpload, { ImportOptions } from './components/FileUpload'
import ToastHost, { ToastItem } from './components/Toast'
import DashboardSkeleton from './components/Skeleton'
import { parseFile } from './lib/parser'
import { anonymizeTransactions, processWithoutAnonymization } from './lib/anonymizer'
import {
  categorizeWithRules,
  setLearnedMappings,
  setLocalLearnedMapping,
  setExpenseCategories,
} from './lib/categorizer'
import { getLayout, layoutCategories, syncSheetLayout } from './lib/sheetLayout'
import { detectRecurring } from './lib/recurring'
import { detectDoubleBookings } from './lib/double-booking'
import { getLearnedMappings, saveBatchLearnedMappings, deleteLearnedMapping, getSheetConfig, saveSheetConfig } from './lib/api'
import { saveSession, loadSession, clearSession, getRememberPreference, setRememberPreference } from './lib/storage'
import { getNumberFormat, setNumberFormat, NumberFormat } from './lib/format'
import { recategorize as applyRecategorize } from './lib/recategorize'
import { assignStableIds } from './lib/ids'
import { mergeWithoutDuplicates } from './lib/dedupe'
import { transactionsToCsv, downloadCsv } from './lib/csv'
import { applyAliases, saveAlias } from './lib/aliases'
import { SplitMap, SplitPart, applySplits, removeSplit } from './lib/splits'
import { RateMap, loadRates, saveRates, baseCurrencyOf, foreignCurrenciesOf, applyRates } from './lib/rates'
import { merchantKeyOf, sameMerchant } from './lib/categorizer'
import HeaderMenu from './components/HeaderMenu'
import ImportConfirm from './components/ImportConfirm'
import { Shield, ShieldOff, Loader2, FilePlus } from 'lucide-react'

interface MappingChange {
  merchant: string
  category: string
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(null)
  const [anonymizationEnabled, setAnonymizationEnabled] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [pendingSaves, setPendingSaves] = useState(0)
  const [remember, setRemember] = useState(getRememberPreference())
  const [rates, setRates] = useState<RateMap>(loadRates())
  const [pendingImport, setPendingImport] = useState<{ incoming: RawTransaction[]; duplicates: number; fileName: string } | null>(null)
  // Held in state so changing it re-renders every number in the app
  const [numberFormat, setNumberFormatState] = useState<NumberFormat>(getNumberFormat())
  const toggleNumberFormat = () => {
    const next: NumberFormat = numberFormat === 'point' ? 'comma' : 'point'
    setNumberFormat(next)
    setNumberFormatState(next)
  }

  // Store raw transactions to allow toggling anonymization
  const rawTransactionsRef = useRef<RawTransaction[]>([])
  // Always-current copy so rapid edits never work from a stale snapshot
  const transactionsRef = useRef<Transaction[]>([])
  const splitsRef = useRef<SplitMap>({})
  const toastId = useRef(0)

  const commit = useCallback((next: Transaction[]) => {
    transactionsRef.current = next
    setTransactions(next)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = ++toastId.current
    // A new undoable action replaces older undo toasts (their snapshots would be stale)
    setToasts(prev => {
      const kept = toast.actionLabel === 'Undo' ? prev.filter(t => t.actionLabel !== 'Undo') : prev
      return [...kept.slice(-2), { ...toast, id }]
    })
  }, [])

  // Load learned categorizations on startup, then restore the saved session
  useEffect(() => {
    async function init() {
      const mappings = await getLearnedMappings()
      if (mappings.length > 0) {
        setLearnedMappings(mappings)
      }
      const saved = getRememberPreference() ? await loadSession() : null
      if (saved && saved.transactions.length > 0) {
        rawTransactionsRef.current = saved.raw
        splitsRef.current = saved.splits || {}
        commit(saved.transactions)
        setAnonymizationEnabled(saved.anonymizationEnabled)
        if (saved.dateRange) {
          setDateRange({ startDate: new Date(saved.dateRange.start), endDate: new Date(saved.dateRange.end) })
        }
      }
      setIsRestoring(false)
    }
    init()
  }, [commit])

  // Load the saved sheet config, then quietly re-read the sheet's header row so new or
  // reordered columns show up without any code change. Falls back to the stored layout.
  useEffect(() => {
    let cancelled = false
    async function loadSheet() {
      const config = await getSheetConfig()
      if (!config || cancelled) return
      setSheetConfig(config)
      if (!config.sheetId) return
      try {
        const synced = await syncSheetLayout(config)
        if (cancelled) return
        setSheetConfig(synced)
        if (JSON.stringify(synced.layout) !== JSON.stringify(config.layout)) saveSheetConfig(synced)
      } catch {
        // Sheet unreachable (offline / no credentials): keep the stored layout
      }
    }
    loadSheet()
    return () => {
      cancelled = true
    }
  }, [])

  // Categories follow the sheet's columns (idempotent, safe to run on every render)
  setExpenseCategories(layoutCategories(getLayout(sheetConfig)))

  // Save the session (debounced) so a refresh doesn't lose work
  useEffect(() => {
    if (isRestoring || transactions.length === 0 || !remember) return
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
  }, [transactions, dateRange, anonymizationEnabled, isRestoring, remember])

  const handleToggleRemember = () => {
    const next = !remember
    setRemember(next)
    setRememberPreference(next)
    if (!next) {
      clearSession()
      pushToast({ message: 'Data is no longer saved on this device', tone: 'success' })
    }
  }

  // Currency: show everything in the main currency, converting with the rates the user entered
  const baseCurrency = useMemo(() => baseCurrencyOf(transactions), [transactions])
  const foreignCurrencies = useMemo(() => foreignCurrenciesOf(transactions, baseCurrency), [transactions, baseCurrency])
  const displayTransactions = useMemo(() => applyRates(transactions, baseCurrency, rates), [transactions, baseCurrency, rates])
  const handleRatesChange = (next: RateMap) => {
    setRates(next)
    saveRates(next)
  }

  const processTransactions = (raw: RawTransaction[], anonymize: boolean) => {
    // Process with or without anonymization
    const base = anonymize 
      ? anonymizeTransactions(raw).transactions
      : processWithoutAnonymization(raw)
    // Content-based ids: re-processing gives the same ids, so manual edits survive
    const processed = assignStableIds(base, raw)
    
    // Apply rule-based categorization
    const categorized = categorizeWithRules(processed)
    
    // Detect double-bookings (internal transfers between own accounts)
    const { transactions: withDoubleBookings } = detectDoubleBookings(categorized)
    
    // Detect recurring transactions, then apply the user's merchant names
    return applyAliases(detectRecurring(withDoubleBookings))
  }

  const handleFileUpload = async (file: File, options: ImportOptions) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Parse file (CSV, Excel, or OFX)
      let rawTransactions = await parseFile(file)
      
      // Apply date filter if specified (filter early to reduce processing load)
      if (options.dateFilter !== 'all' && options.customStartDate) {
        const startTime = options.customStartDate.getTime()
        const endTime = options.customEndDate?.getTime() || Date.now()
        
        const beforeCount = rawTransactions.length
        rawTransactions = rawTransactions.filter(tx => {
          const txTime = new Date(tx.date).getTime()
          return txTime >= startTime && txTime <= endTime
        })
        
        console.log(`Date filter: ${beforeCount} → ${rawTransactions.length} transactions`)
      }
      
      rawTransactionsRef.current = rawTransactions
      splitsRef.current = {}
      
      // Process transactions
      const processed = processTransactions(rawTransactions, anonymizationEnabled)
      commit(processed)
      
      // Auto-detect date range from the actual transaction data
      if (processed.length > 0) {
        const dates = processed.map(tx => new Date(tx.date).getTime())
        const minDate = new Date(Math.min(...dates))
        const maxDate = new Date(Math.max(...dates))
        
        // Set to the month range of the data
        // Set endDate to end of day (23:59:59.999) to include all transactions on that day
        const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)
        
        setDateRange({
          startDate: new Date(minDate.getFullYear(), minDate.getMonth(), 1),
          endDate: endDate
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }

  // Re-run processing over raw rows, keeping the user's manual edits (matched by stable id)
  const reprocess = (raw: RawTransaction[], anonymize: boolean): Transaction[] => {
    const manual = new Map(
      transactionsRef.current.filter(t => t.categorySource === 'manual').map(t => [t.id, t])
    )
    const processed = processTransactions(raw, anonymize).map(t => {
      const old = manual.get(t.id)
      return old
        ? { ...t, category: old.category, isExcluded: old.isExcluded, categorySource: 'manual' as const }
        : t
    })
    // Splits are stored separately, so they're re-applied to the fresh parents
    const fresh: SplitMap = {}
    for (const [id, rec] of Object.entries(splitsRef.current)) {
      const parent = processed.find(t => t.id === id)
      if (parent) fresh[id] = { ...rec, parent }
    }
    splitsRef.current = fresh
    return applySplits(processed, fresh)
  }

  // Add another file to what's already loaded. If some rows already exist, ask what to do.
  const handleAddFile = async (file: File) => {
    try {
      const incoming = await parseFile(file)
      const { skipped } = mergeWithoutDuplicates(rawTransactionsRef.current, incoming)
      if (skipped > 0) {
        setPendingImport({ incoming, duplicates: skipped, fileName: file.name })
      } else {
        finishAdd(incoming, false)
      }
    } catch (err) {
      pushToast({ message: err instanceof Error ? err.message : 'Failed to read file', tone: 'error' })
    }
  }

  const finishAdd = (incoming: RawTransaction[], keepDuplicates: boolean) => {
    const existing = rawTransactionsRef.current
    const { merged, added, skipped } = keepDuplicates
      ? { merged: [...existing, ...incoming], added: incoming.length, skipped: 0 }
      : mergeWithoutDuplicates(existing, incoming)
    const previous = transactionsRef.current
    const previousRaw = existing
    const previousSplits = splitsRef.current
    rawTransactionsRef.current = merged
    const next = reprocess(merged, anonymizationEnabled)
    commit(next)
    // Widen the date range to include the new rows
    const times = next.map(t => new Date(t.date).getTime())
    const min = new Date(Math.min(...times))
    const max = new Date(Math.max(...times))
    const end = new Date(max.getFullYear(), max.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    setDateRange({ startDate: new Date(min.getFullYear(), min.getMonth(), 1), endDate: end })
    pushToast({
      message: `Added ${added} new transaction${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''}`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        rawTransactionsRef.current = previousRaw
        splitsRef.current = previousSplits
        commit(previous)
      },
    })
  }

  const handleDownloadCsv = () => {
    downloadCsv(`finkit-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCsv(transactionsRef.current))
  }

  const handleToggleAnonymization = () => {
    const newValue = !anonymizationEnabled
    setAnonymizationEnabled(newValue)
    
    // Re-process transactions with new anonymization setting
    if (rawTransactionsRef.current.length > 0) {
      commit(reprocess(rawTransactionsRef.current, newValue))
    }
  }

  const handleClearData = () => {
    const snapshot = {
      transactions: transactionsRef.current,
      raw: rawTransactionsRef.current,
      splits: splitsRef.current,
      dateRange,
    }
    splitsRef.current = {}
    commit([])
    setDateRange(null)
    setError(null)
    clearSession()
    pushToast({
      message: `Cleared ${snapshot.transactions.length} transactions`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        rawTransactionsRef.current = snapshot.raw
        splitsRef.current = snapshot.splits
        commit(snapshot.transactions)
        setDateRange(snapshot.dateRange)
      },
    })
  }

  // Save learned mappings in the background; tell the user if the server didn't confirm
  const persistMappings = useCallback(async (changes: MappingChange[]) => {
    if (changes.length === 0) return
    setPendingSaves(n => n + 1)
    const ok = await saveBatchLearnedMappings(changes)
    setPendingSaves(n => n - 1)
    if (!ok) {
      pushToast({
        message: "Couldn't save this for future imports.",
        tone: 'error',
        actionLabel: 'Retry',
        onAction: () => persistMappings(changes),
      })
    }
  }, [pushToast])

  /**
   * Core edit: set a category on some transactions, learn the merchant, and apply it to every
   * other transaction from the same merchant that the user hasn't categorized by hand.
   */
  const recategorize = (ids: string[], category: string, extra: Partial<Transaction> = {}) => {
    const current = transactionsRef.current
    const result = applyRecategorize(current, ids, category, extra)
    if (!result) return

    // Learn: update the local cache now (so re-processing keeps it), server in background
    const previousMappings = result.merchants.map(m => ({ merchant: m, previous: setLocalLearnedMapping(m, category) }))
    persistMappings(result.merchants.map(m => ({ merchant: m, category })))

    commit(result.next)

    const label = result.merchants.length === 1 ? result.merchants[0] : `${result.targetCount} transactions`
    const others = result.siblingCount > 0 ? ` · also updated ${result.siblingCount} similar` : ''
    pushToast({
      message: `${label} → ${category}${others}`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        commit(current)
        const restore: MappingChange[] = []
        for (const { merchant, previous } of previousMappings) {
          setLocalLearnedMapping(merchant, previous)
          if (previous) restore.push({ merchant, category: previous })
          else deleteLearnedMapping(merchant)
        }
        persistMappings(restore)
      },
    })
  }

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    const { category, ...rest } = updates
    const current = transactionsRef.current
    const existing = current.find(t => t.id === id)
    if (!existing) return

    if (category && category !== existing.category) {
      recategorize([id], category, rest)
      return
    }

    commit(current.map(t => (t.id === id ? { ...t, ...updates, categorySource: 'manual' as const } : t)))
    if ('isExcluded' in updates) {
      pushToast({
        message: updates.isExcluded ? 'Excluded from totals' : 'Included in totals',
        tone: 'success',
        actionLabel: 'Undo',
        onAction: () => commit(current),
      })
    }
  }

  const handleBulkUpdate = (ids: string[], updates: Partial<Transaction>) => {
    const { category, ...rest } = updates
    if (category) {
      recategorize(ids, category, rest)
      return
    }
    const current = transactionsRef.current
    const idSet = new Set(ids)
    commit(current.map(t => (idSet.has(t.id) ? { ...t, ...updates, categorySource: 'manual' as const } : t)))
    pushToast({
      message: `${updates.isExcluded ? 'Excluded' : 'Included'} ${ids.length} transactions`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => commit(current),
    })
  }

  // Split one transaction across several categories (e.g. a supermarket shop that included a gift)
  const handleSplit = (id: string, parts: SplitPart[]) => {
    const current = transactionsRef.current
    const prevSplits = splitsRef.current
    const existing = prevSplits[id]
    const target = existing ? existing.parent : current.find(t => t.id === id)
    if (!target) return
    const base = existing ? removeSplit(current, id, target) : current
    splitsRef.current = { ...prevSplits, [id]: { parent: target, parts } }
    commit(applySplits(base, { [id]: { parent: target, parts } }))
    pushToast({
      message: `Split into ${parts.length} parts`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        splitsRef.current = prevSplits
        commit(current)
      },
    })
  }

  const handleUnsplit = (parentId: string) => {
    const current = transactionsRef.current
    const prevSplits = splitsRef.current
    const record = prevSplits[parentId]
    if (!record) return
    const { [parentId]: _removed, ...rest } = prevSplits
    splitsRef.current = rest
    commit(removeSplit(current, parentId, record.parent))
    pushToast({
      message: 'Split removed',
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        splitsRef.current = prevSplits
        commit(current)
      },
    })
  }

  // Rename how a merchant is shown (grouping and learned rules still use the original name)
  const handleRenameMerchant = (merchantKey: string, name: string) => {
    const current = transactionsRef.current
    const previousName = current.find(t => sameMerchant(merchantKeyOf(t), merchantKey))?.displayName
    saveAlias(merchantKey, name)
    commit(current.map(t => (sameMerchant(merchantKeyOf(t), merchantKey) ? { ...t, displayName: name.trim() || undefined } : t)))
    pushToast({
      message: name.trim() ? `Showing "${merchantKey}" as ${name.trim()}` : `Reset name for ${merchantKey}`,
      tone: 'success',
      actionLabel: 'Undo',
      onAction: () => {
        saveAlias(merchantKey, previousName ?? null)
        commit(current)
      },
    })
  }

  return (
    <div className="min-h-screen bg-midnight-950">
      <header className="border-b border-midnight-800 bg-midnight-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                <span className="text-xl font-bold text-white">F</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">FinKit</h1>
                <p className="text-xs text-midnight-400">Transaction analysis & insights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {transactions.length > 0 && (
                <>
                  {pendingSaves > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-midnight-400" aria-live="polite">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving…
                    </span>
                  )}
                  <button
                    onClick={handleToggleAnonymization}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                      ${anonymizationEnabled 
                        ? 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30' 
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                      }
                    `}
                    title={anonymizationEnabled ? 'Click to show original data' : 'Click to anonymize data'}
                  >
                    {anonymizationEnabled ? (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Anonymized</span>
                      </>
                    ) : (
                      <>
                        <ShieldOff className="w-4 h-4" />
                        <span>Original</span>
                      </>
                    )}
                  </button>
                  <label className="btn-secondary text-sm flex items-center gap-2 cursor-pointer" title="Add another file">
                    <FilePlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add file</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.ofx,.qfx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleAddFile(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </>
              )}
              <HeaderMenu
                hasData={transactions.length > 0}
                numberFormatLabel={numberFormat === 'point' ? '1,234.56' : '1.234,56'}
                onToggleNumberFormat={toggleNumberFormat}
                remember={remember}
                onToggleRemember={handleToggleRemember}
                onDownloadCsv={handleDownloadCsv}
                onClear={handleClearData}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isRestoring ? (
          <DashboardSkeleton />
        ) : transactions.length === 0 ? (
          <FileUpload 
            onFileUpload={handleFileUpload} 
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <Dashboard
            transactions={displayTransactions}
            baseCurrency={baseCurrency}
            foreignCurrencies={foreignCurrencies}
            rates={rates}
            onRatesChange={handleRatesChange}
            onSplit={handleSplit}
            onUnsplit={handleUnsplit}
            onRenameMerchant={handleRenameMerchant}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onUpdateTransaction={handleUpdateTransaction}
            onBulkUpdate={handleBulkUpdate}
            sheetConfig={sheetConfig}
            onSheetConfigChange={setSheetConfig}
          />
        )}
      </main>

      {pendingImport && (
        <ImportConfirm
          fileName={pendingImport.fileName}
          total={pendingImport.incoming.length}
          duplicates={pendingImport.duplicates}
          onSkip={() => {
            finishAdd(pendingImport.incoming, false)
            setPendingImport(null)
          }}
          onKeepAll={() => {
            finishAdd(pendingImport.incoming, true)
            setPendingImport(null)
          }}
          onCancel={() => setPendingImport(null)}
        />
      )}

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
