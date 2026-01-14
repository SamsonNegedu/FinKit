import { useState } from 'react'
import { Transaction } from '../types'
import { ArrowLeftRight, Check, X, Eye, EyeOff, TrendingUp } from 'lucide-react'

interface IncomeReviewProps {
  transactions: Transaction[]
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  currency: string
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  })
}

export default function IncomeReview({
  transactions,
  onUpdateTransaction,
  currency,
}: IncomeReviewProps) {
  const [filter, setFilter] = useState<'all' | 'included' | 'excluded'>('all')

  // Get all income transactions
  const incomeTransactions = transactions
    .filter(tx => tx.type === 'income')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Apply filter
  const filteredTransactions = incomeTransactions.filter(tx => {
    if (filter === 'included') return !tx.isExcluded
    if (filter === 'excluded') return tx.isExcluded
    return true
  })

  // Calculate totals
  const totalIncome = incomeTransactions
    .filter(tx => !tx.isExcluded)
    .reduce((sum, tx) => sum + tx.amount, 0)

  const excludedIncome = incomeTransactions
    .filter(tx => tx.isExcluded)
    .reduce((sum, tx) => sum + tx.amount, 0)

  const autoExcludedCount = incomeTransactions.filter(tx => tx.isExcluded && tx.doubleBookingMatch).length
  const manualExcludedCount = incomeTransactions.filter(tx => tx.isExcluded && !tx.doubleBookingMatch).length

  const handleToggleExclude = (id: string, currentlyExcluded: boolean) => {
    onUpdateTransaction(id, { isExcluded: !currentlyExcluded })
  }

  return (
    <div className="card space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-income/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-income" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Income Review</h3>
            <p className="text-sm text-midnight-400">
              Review and adjust which income is counted in totals
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-midnight-800 rounded-lg p-4">
          <p className="text-sm text-midnight-400 mb-1">Counted Income</p>
          <p className="text-xl font-bold text-income">{formatCurrency(totalIncome, currency)}</p>
          <p className="text-xs text-midnight-500 mt-1">
            {incomeTransactions.filter(tx => !tx.isExcluded).length} transactions
          </p>
        </div>
        <div className="bg-midnight-800 rounded-lg p-4">
          <p className="text-sm text-midnight-400 mb-1">Excluded Income</p>
          <p className="text-xl font-bold text-orange-400">{formatCurrency(excludedIncome, currency)}</p>
          <p className="text-xs text-midnight-500 mt-1">
            {autoExcludedCount} auto + {manualExcludedCount} manual
          </p>
        </div>
        <div className="bg-midnight-800 rounded-lg p-4">
          <p className="text-sm text-midnight-400 mb-1">Total Entries</p>
          <p className="text-xl font-bold text-white">{incomeTransactions.length}</p>
          <p className="text-xs text-midnight-500 mt-1">
            income transactions
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-midnight-700 pb-3">
        {[
          { id: 'all', label: 'All', count: incomeTransactions.length },
          { id: 'included', label: 'Counted', count: incomeTransactions.filter(tx => !tx.isExcluded).length },
          { id: 'excluded', label: 'Excluded', count: incomeTransactions.filter(tx => tx.isExcluded).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
              ${filter === tab.id
                ? 'bg-accent text-white'
                : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
              }
            `}
          >
            {tab.label}
            <span className={`
              px-1.5 py-0.5 rounded text-xs
              ${filter === tab.id ? 'bg-white/20' : 'bg-midnight-700'}
            `}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-midnight-400">
            No transactions match this filter
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-all
                ${tx.isExcluded 
                  ? 'bg-midnight-800/50 border-midnight-700 opacity-60' 
                  : 'bg-midnight-800 border-midnight-600'
                }
              `}
            >
              {/* Exclude Toggle */}
              <button
                onClick={() => handleToggleExclude(tx.id, tx.isExcluded || false)}
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0
                  ${tx.isExcluded
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'bg-income/20 text-income hover:bg-income/30'
                  }
                `}
                title={tx.isExcluded ? 'Click to include in totals' : 'Click to exclude from totals'}
              >
                {tx.isExcluded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              {/* Date */}
              <div className="w-16 shrink-0">
                <span className="text-sm text-midnight-300">{formatDate(tx.date)}</span>
              </div>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {tx.merchant || tx.recipient || tx.description.slice(0, 40)}
                </p>
                <p className="text-xs text-midnight-500 truncate">{tx.description}</p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 shrink-0">
                {tx.doubleBookingMatch && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                    <ArrowLeftRight className="w-3 h-3" />
                    Auto
                  </span>
                )}
                {tx.isExcluded && !tx.doubleBookingMatch && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">
                    <X className="w-3 h-3" />
                    Manual
                  </span>
                )}
                {!tx.isExcluded && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-income/20 text-income">
                    <Check className="w-3 h-3" />
                    Counted
                  </span>
                )}
              </div>

              {/* Amount */}
              <div className="w-28 text-right shrink-0">
                <span className={`text-sm font-medium ${tx.isExcluded ? 'text-midnight-400 line-through' : 'text-income'}`}>
                  +{formatCurrency(tx.amount, currency)}
                </span>
              </div>

              {/* Account */}
              <div className="w-32 text-right shrink-0 hidden lg:block">
                <span className="text-xs text-midnight-500 truncate block">
                  {tx.referenceAccountName || 'Unknown'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-midnight-700 text-xs text-midnight-400">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-500/30"></span>
          <span>Auto-excluded (internal transfer detected)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-orange-500/30"></span>
          <span>Manually excluded</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-income/30"></span>
          <span>Counted in totals</span>
        </div>
      </div>
    </div>
  )
}
