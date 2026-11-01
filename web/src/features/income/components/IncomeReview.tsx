import { useMemo, useState } from 'react'
import { Transaction } from '@/shared/types'
import { TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/shared/utils/format'
import { parseLocalDate } from '@/shared/utils/dates'
import IncomeTransactionRow from './IncomeTransactionRow'

interface IncomeReviewProps {
  transactions: Transaction[]
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  currency: string
}

export default function IncomeReview({ transactions, onUpdateTransaction, currency }: IncomeReviewProps) {
  const [filter, setFilter] = useState<'all' | 'included' | 'excluded'>('all')

  const incomeTransactions = useMemo(
    () =>
      transactions
        .filter(tx => tx.type === 'income')
        .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()),
    [transactions],
  )

  const filteredTransactions = incomeTransactions.filter(tx => {
    if (filter === 'included') return !tx.isExcluded
    if (filter === 'excluded') return tx.isExcluded
    return true
  })

  const totalIncome = incomeTransactions.filter(tx => !tx.isExcluded).reduce((sum, tx) => sum + tx.amount, 0)
  const excludedIncome = incomeTransactions.filter(tx => tx.isExcluded).reduce((sum, tx) => sum + tx.amount, 0)
  const autoExcludedCount = incomeTransactions.filter(tx => tx.isExcluded && tx.doubleBookingMatch).length
  const manualExcludedCount = incomeTransactions.filter(tx => tx.isExcluded && !tx.doubleBookingMatch).length

  const handleToggleExclude = (id: string, currentlyExcluded: boolean) => {
    onUpdateTransaction(id, { isExcluded: !currentlyExcluded })
  }

  const tabs = [
    { id: 'all' as const, label: 'All', count: incomeTransactions.length },
    { id: 'included' as const, label: 'Counted', count: incomeTransactions.filter(tx => !tx.isExcluded).length },
    { id: 'excluded' as const, label: 'Excluded', count: incomeTransactions.filter(tx => tx.isExcluded).length },
  ]

  return (
    <div className="card space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-income/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-income" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Income Review</h3>
            <p className="text-sm text-midnight-400">Review and adjust which income is counted in totals</p>
          </div>
        </div>
      </div>

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
          <p className="text-xs text-midnight-500 mt-1">income transactions</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-midnight-700 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
              ${filter === tab.id ? 'bg-accent text-white' : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'}
            `}
          >
            {tab.label}
            <span
              className={`
              px-1.5 py-0.5 rounded text-xs
              ${filter === tab.id ? 'bg-white/20' : 'bg-midnight-700'}
            `}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-midnight-400">No transactions match this filter</div>
        ) : (
          filteredTransactions.map(tx => (
            <IncomeTransactionRow key={tx.id} tx={tx} currency={currency} onToggleExclude={handleToggleExclude} />
          ))
        )}
      </div>

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
