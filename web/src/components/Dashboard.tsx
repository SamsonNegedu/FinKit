import { useState, useMemo } from 'react'
import { Transaction, DateRange, SheetConfig, AnalysisSummary } from '../types'
import SummaryCards from './SummaryCards'
import TransactionTable from './TransactionTable'
import SearchFilter from './SearchFilter'
import CategoryChart from './charts/CategoryChart'
import SpendingTrend from './charts/SpendingTrend'
import TopExpenses from './charts/TopExpenses'
import SettingsPanel from './SettingsPanel'
import ExportButton from './ExportButton'
import IncomeReview from './IncomeReview'
import { CATEGORY_COLORS } from '../lib/categorizer'

interface DashboardProps {
  transactions: Transaction[]
  dateRange: DateRange | null
  onDateRangeChange: (range: DateRange | null) => void
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  onBulkUpdate: (ids: string[], updates: Partial<Transaction>) => void
  sheetConfig: SheetConfig | null
  onSheetConfigChange: (config: SheetConfig | null) => void
}

type Tab = 'transactions' | 'income' | 'analytics' | 'trends'

export default function Dashboard({
  transactions,
  dateRange,
  onDateRangeChange,
  onUpdateTransaction,
  onBulkUpdate,
  sheetConfig,
  onSheetConfigChange,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('transactions')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showTransfers, setShowTransfers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Date-filtered transactions (used for Income Review - includes all income regardless of transfer status)
  const dateFilteredTransactions = useMemo(() => {
    if (!dateRange) return transactions
    return transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= dateRange.startDate && txDate <= dateRange.endDate
    })
  }, [transactions, dateRange])

  // Filter transactions based on date range, search, and categories
  const filteredTransactions = useMemo(() => {
    return dateFilteredTransactions.filter(tx => {
      // Exclude transfers unless explicitly shown
      if (!showTransfers && tx.category === 'Transfer') {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = `${tx.description} ${tx.merchant || ''} ${tx.category || ''} ${tx.recipient || ''}`.toLowerCase()
        if (!searchableText.includes(query)) {
          return false
        }
      }

      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(tx.category || 'Other')) {
        return false
      }

      return true
    })
  }, [dateFilteredTransactions, searchQuery, selectedCategories, showTransfers])

  // Calculate summary
  const summary: AnalysisSummary = useMemo(() => {
    const expenses = filteredTransactions.filter(tx => tx.type === 'expense' && !tx.isExcluded)
    const income = filteredTransactions.filter(tx => tx.type === 'income' && !tx.isExcluded)

    const totalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0)
    const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0)

    // Category breakdown
    const categoryMap = new Map<string, { total: number; count: number }>()
    for (const tx of expenses) {
      const cat = tx.category || 'Other'
      const existing = categoryMap.get(cat) || { total: 0, count: 0 }
      categoryMap.set(cat, {
        total: existing.total + tx.amount,
        count: existing.count + 1,
      })
    }

    const categorySummary = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
        color: CATEGORY_COLORS[category] || '#64748b',
      }))
      .sort((a, b) => b.total - a.total)

    // Top merchants
    const merchantMap = new Map<string, { total: number; count: number }>()
    for (const tx of expenses) {
      const merchant = tx.merchant || tx.recipient || tx.description.slice(0, 20)
      const existing = merchantMap.get(merchant) || { total: 0, count: 0 }
      merchantMap.set(merchant, {
        total: existing.total + tx.amount,
        count: existing.count + 1,
      })
    }

    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({ merchant, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Calculate average daily spend
    const days = dateRange 
      ? Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 30
    const avgDailySpend = totalExpense / days

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      avgDailySpend,
      categorySummary,
      topMerchants,
      currency: transactions[0]?.currency || 'EUR',
    }
  }, [filteredTransactions, dateRange, transactions])

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)))
    }
  }

  const handleBulkCategoryChange = (category: string) => {
    onBulkUpdate(Array.from(selectedIds), { category })
    setSelectedIds(new Set())
  }

  const handleBulkExclude = () => {
    onBulkUpdate(Array.from(selectedIds), { isExcluded: true })
    setSelectedIds(new Set())
  }

  const handleBulkInclude = () => {
    onBulkUpdate(Array.from(selectedIds), { isExcluded: false })
    setSelectedIds(new Set())
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'transactions', label: 'Transactions' },
    { id: 'income', label: 'Income Review' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'trends', label: 'Trends' },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Search & Filter Bar */}
      <div className="card">
        <SearchFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          showTransfers={showTransfers}
          onShowTransfersChange={setShowTransfers}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          transactionCount={filteredTransactions.length}
          totalCount={transactions.length}
          transactions={transactions}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ExportButton
            transactions={filteredTransactions}
            sheetConfig={sheetConfig}
            dateRange={dateRange}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'transactions' && (
        <TransactionTable
          transactions={filteredTransactions}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onSelectAll={handleSelectAll}
          onUpdateTransaction={onUpdateTransaction}
          onBulkCategoryChange={handleBulkCategoryChange}
          onBulkExclude={handleBulkExclude}
          onBulkInclude={handleBulkInclude}
          currency={summary.currency}
        />
      )}

      {activeTab === 'income' && (
        <IncomeReview
          transactions={dateFilteredTransactions}
          onUpdateTransaction={onUpdateTransaction}
          currency={summary.currency}
        />
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryChart categorySummary={summary.categorySummary} currency={summary.currency} />
          <TopExpenses topMerchants={summary.topMerchants} currency={summary.currency} />
        </div>
      )}

      {activeTab === 'trends' && (
        <SpendingTrend 
          transactions={filteredTransactions} 
          dateRange={dateRange}
          currency={summary.currency}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          config={sheetConfig}
          onSave={(config) => {
            onSheetConfigChange(config)
            setShowSettings(false)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
