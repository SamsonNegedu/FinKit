import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, RefreshCw, ArrowUpDown, ArrowLeftRight } from 'lucide-react'
import { Transaction } from '../types'
import { AVAILABLE_CATEGORIES, CATEGORY_COLORS } from '../lib/categorizer'
import RecurringBadge from './RecurringBadge'
import BulkActionBar from './BulkActionBar'

interface TransactionTableProps {
  transactions: Transaction[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onSelectAll: () => void
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  onBulkCategoryChange: (category: string) => void
  onBulkExclude: () => void
  onBulkInclude: () => void
  currency: string
}

type SortField = 'date' | 'amount' | 'category' | 'description'
type SortDirection = 'asc' | 'desc'

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

export default function TransactionTable({
  transactions,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  onUpdateTransaction,
  onBulkCategoryChange,
  onBulkExclude,
  onBulkInclude,
  currency,
}: TransactionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [categorySearch, setCategorySearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEditingId(null)
        setCategorySearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEditingId(null)
        setCategorySearch('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
      case 'amount':
        comparison = a.amount - b.amount
        break
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '')
        break
      case 'description':
        comparison = a.description.localeCompare(b.description)
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectionChange(newSelected)
  }

  const filteredCategories = AVAILABLE_CATEGORIES.filter(c =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  )

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-white transition-colors"
    >
      {children}
      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-accent' : 'text-midnight-500'}`} />
    </button>
  )

  return (
    <div className="relative">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => onSelectionChange(new Set())}
          onCategoryChange={onBulkCategoryChange}
          onExclude={onBulkExclude}
          onInclude={onBulkInclude}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-midnight-700">
              <th className="p-4 w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === transactions.length && transactions.length > 0}
                  onChange={onSelectAll}
                  className="rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
                />
              </th>
              <th className="p-4 w-20 text-left text-sm font-medium text-midnight-400">
                <SortButton field="date">Date</SortButton>
              </th>
              <th className="p-4 text-left text-sm font-medium text-midnight-400">
                <SortButton field="description">Description</SortButton>
              </th>
              <th className="p-4 w-40 text-left text-sm font-medium text-midnight-400">
                <SortButton field="category">Category</SortButton>
              </th>
              <th className="p-4 w-28 text-right text-sm font-medium text-midnight-400">
                <SortButton field="amount">Amount</SortButton>
              </th>
            </tr>
          </thead>
            <tbody>
              {sortedTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className={`
                    border-b border-midnight-800 hover:bg-midnight-800/50 transition-colors
                    ${selectedIds.has(tx.id) ? 'bg-midnight-800/30' : ''}
                    ${tx.isExcluded ? 'opacity-50' : ''}
                  `}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => handleToggleSelect(tx.id)}
                      className="rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
                    />
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-midnight-300">{formatDate(tx.date)}</span>
                  </td>
                  <td className="p-4 max-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm text-white truncate" title={tx.merchant || tx.recipient || tx.description}>
                          {tx.merchant || tx.recipient || tx.description.slice(0, 40)}
                        </p>
                        <p className="text-xs text-midnight-500 truncate" title={tx.description}>{tx.description}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {tx.isExcluded && !tx.doubleBookingMatch && (
                          <span 
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            title="Excluded from totals"
                          >
                            <span className="hidden sm:inline">Excluded</span>
                          </span>
                        )}
                        {tx.doubleBookingMatch && (
                          <span 
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            title={`Internal transfer - ${tx.isExcluded ? 'excluded from totals' : 'counted in totals'}`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span className="hidden sm:inline">Transfer</span>
                          </span>
                        )}
                        {tx.isRecurring && <RecurringBadge frequency={tx.recurringFrequency} />}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 relative">
                    <button
                      onClick={() => setEditingId(editingId === tx.id ? null : tx.id)}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                        ${editingId === tx.id 
                          ? 'bg-accent/20 ring-2 ring-accent' 
                          : 'hover:bg-midnight-700'
                        }
                      `}
                      style={{ 
                        backgroundColor: editingId !== tx.id ? `${CATEGORY_COLORS[tx.category || 'Other']}20` : undefined
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: CATEGORY_COLORS[tx.category || 'Other'] }}
                      />
                      <span className="text-midnight-100">{tx.category || 'Other'}</span>
                      {tx.categorySource === 'ai' && (
                        <RefreshCw className="w-3 h-3 text-accent" />
                      )}
                      <ChevronDown className="w-3 h-3 text-midnight-400" />
                    </button>

                    {editingId === tx.id && (
                      <div
                        ref={dropdownRef}
                        className="absolute top-full left-0 mt-1 bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-hidden"
                      >
                        <input
                          type="text"
                          placeholder="Search categories..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          className="w-full px-3 py-2 bg-midnight-700 border-b border-midnight-600 text-sm focus:outline-none"
                          autoFocus
                        />
                        <div className="max-h-[240px] overflow-y-auto">
                          {filteredCategories.map((category) => (
                            <button
                              key={category}
                              onClick={() => {
                                onUpdateTransaction(tx.id, { category })
                                setEditingId(null)
                                setCategorySearch('')
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-midnight-700 text-left"
                            >
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: CATEGORY_COLORS[category] }}
                              />
                              <span className="text-sm flex-1">{category}</span>
                              {category === tx.category && (
                                <Check className="w-4 h-4 text-accent" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-midnight-400">No transactions match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
