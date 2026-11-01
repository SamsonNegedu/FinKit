import { Fragment, useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight, Check, RefreshCw, ArrowUpDown, ArrowLeftRight, List, Layers, Scissors, Pencil, Undo2 } from 'lucide-react'
import { Transaction } from '../types'
import { getAvailableCategories, getCategoryColor, merchantKeyOf, sameMerchant } from '../lib/categorizer'
import RecurringBadge from './RecurringBadge'
import BulkActionBar from './BulkActionBar'
import SplitDialog from './SplitDialog'
import { displayNameOf } from '../lib/aliases'
import { SplitPart } from '../lib/splits'
import { formatCurrency } from '../lib/format'

interface TransactionTableProps {
  transactions: Transaction[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onSelectAll: () => void
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  onBulkCategoryChange: (category: string) => void
  onSetCategoryForIds: (ids: string[], category: string) => void
  onBulkExclude: () => void
  onBulkInclude: () => void
  onSplit: (id: string, parts: SplitPart[]) => void
  onUnsplit: (parentId: string) => void
  onRenameMerchant: (merchantKey: string, name: string) => void
  currency: string
}

type SortField = 'date' | 'amount' | 'category' | 'description'
type SortDirection = 'asc' | 'desc'

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
  onSetCategoryForIds,
  onBulkExclude,
  onBulkInclude,
  onSplit,
  onUnsplit,
  onRenameMerchant,
  currency,
}: TransactionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [categorySearch, setCategorySearch] = useState('')
  const PAGE = 200
  const [limit, setLimit] = useState(PAGE)
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'merchant'>('list')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pickerPos, setPickerPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const [splitting, setSplitting] = useState<Transaction | null>(null)
  const [renamingKey, setRenamingKey] = useState<string | null>(null)

  // The picker is drawn on <body> at a fixed spot so no table/card edge can clip it;
  // it opens upward when there isn't room below.
  const openPicker = (id: string, trigger: HTMLElement) => {
    if (editingId === id) {
      setEditingId(null)
      return
    }
    const r = trigger.getBoundingClientRect()
    const width = 220
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    const flip = r.bottom + 310 > window.innerHeight && r.top > 310
    setPickerPos(flip ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 })
    setActiveIndex(0)
    setEditingId(id)
  }

  // A fixed picker doesn't follow the page, so close it when the page scrolls or resizes
  useEffect(() => {
    if (!editingId) return
    const close = (e: Event) => {
      if (e.type === 'scroll' && dropdownRef.current?.contains(e.target as Node)) return
      setEditingId(null)
      setCategorySearch('')
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [editingId])

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

  const sortedTransactions = useMemo(() => [...transactions].sort((a, b) => {
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
  }), [transactions, sortField, sortDirection])

  // Big files: render in pages so the table stays fast; reset when the filtered set changes
  useEffect(() => {
    setLimit(PAGE)
  }, [transactions.length, sortField, sortDirection, viewMode])

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

  const filteredCategories = getAvailableCategories().filter(c =>
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

  const groups = useMemo(() => {
    const result: { key: string; items: Transaction[]; total: number; categories: Set<string> }[] = []
    for (const tx of sortedTransactions) {
      const key = merchantKeyOf(tx)
      const group = result.find(g => sameMerchant(g.key, key))
      const signed = tx.isExcluded ? 0 : tx.type === 'income' ? tx.amount : -tx.amount
      if (group) {
        group.items.push(tx)
        group.total += signed
        group.categories.add(tx.category || 'Other')
      } else {
        result.push({ key, items: [tx], total: signed, categories: new Set([tx.category || 'Other']) })
      }
    }
    return result.sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, sortField, sortDirection])

  // In merchant view, show whole groups until about `limit` rows are on screen
  const visibleGroups = useMemo(() => {
    let rows = 0
    const out: typeof groups = []
    for (const g of groups) {
      if (rows >= limit) break
      out.push(g)
      rows += g.items.length + 1
    }
    return out
  }, [groups, limit])
  const shownRows = viewMode === 'list' ? Math.min(limit, sortedTransactions.length) : visibleGroups.reduce((n, g) => n + g.items.length, 0)
  const hasMore = viewMode === 'list' ? limit < sortedTransactions.length : visibleGroups.length < groups.length

  const renderPicker = (current: string | undefined, onPick: (category: string) => void) => pickerPos && createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', ...pickerPos, width: 220 }}
      className="bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl z-[80] max-h-[280px] overflow-hidden"
    >
      <input
        type="text"
        placeholder="Search categories..."
        aria-label="Search categories"
        value={categorySearch}
        onChange={(e) => {
          setCategorySearch(e.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, filteredCategories.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && filteredCategories[activeIndex]) {
            e.preventDefault()
            onPick(filteredCategories[activeIndex])
            setEditingId(null)
            setCategorySearch('')
            setActiveIndex(0)
          }
        }}
        className="w-full px-3 py-2 bg-midnight-700 border-b border-midnight-600 text-sm focus:outline-none"
        autoFocus
      />
      <div className="max-h-[240px] overflow-y-auto" role="listbox" aria-label="Categories">
        {filteredCategories.map((category, i) => (
          <button
            key={category}
            role="option"
            aria-selected={category === current}
            ref={el => { if (el && i === activeIndex) el.scrollIntoView({ block: 'nearest' }) }}
            onClick={() => {
              onPick(category)
              setEditingId(null)
              setCategorySearch('')
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-midnight-700 text-left ${i === activeIndex ? 'bg-midnight-700' : ''}`}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
            <span className="text-sm flex-1">{category}</span>
            {category === current && <Check className="w-4 h-4 text-accent" />}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )

  const renderGroup = (group: (typeof groups)[number]) => {
    const isCollapsed = collapsed.has(group.key)
    const pickerId = `group:${group.key}`
    const mixed = group.categories.size > 1
    const single = mixed ? undefined : [...group.categories][0]
    const shownName = group.items.find(t => t.displayName)?.displayName || group.key
    return (
      <Fragment key={group.key}>
        <tr className="border-b border-midnight-700 bg-midnight-800/40">
          <td className="py-3 px-4" />
          <td colSpan={2} className="py-3 px-4">
            {renamingKey === group.key ? (
              <input
                autoFocus
                defaultValue={shownName}
                aria-label={`Rename ${group.key}`}
                className="input py-1 text-sm w-64"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRenameMerchant(group.key, e.currentTarget.value)
                    setRenamingKey(null)
                  } else if (e.key === 'Escape') {
                    e.stopPropagation()
                    setRenamingKey(null)
                  }
                }}
                onBlur={() => setRenamingKey(null)}
              />
            ) : (
            <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setCollapsed(prev => {
                  const next = new Set(prev)
                  if (next.has(group.key)) next.delete(group.key)
                  else next.add(group.key)
                  return next
                })
              }
              className="flex items-center gap-2 text-left"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-midnight-400" /> : <ChevronDown className="w-4 h-4 text-midnight-400" />}
              <span className="text-sm font-medium text-white truncate">{shownName}</span>
              <span className="text-xs text-midnight-400">{group.items.length}×</span>
            </button>
            <button
              onClick={() => setRenamingKey(group.key)}
              className="p-1 text-midnight-500 hover:text-white"
              aria-label={`Rename ${shownName}`}
              title="Rename (only changes how it's shown)"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            </div>
            )}
          </td>
          <td className="py-3 px-4 relative">
            <button
              onClick={(e) => openPicker(pickerId, e.currentTarget)}
              className="flex items-center gap-2 h-8 px-3 max-w-full rounded-lg text-sm whitespace-nowrap hover:bg-midnight-700 transition-colors"
              title="Set category for all transactions from this merchant"
            >
              {single && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(single) }} />}
              <span className="text-midnight-100">{mixed ? 'Mixed' : single}</span>
              <ChevronDown className="w-3 h-3 text-midnight-400" />
            </button>
            {editingId === pickerId &&
              renderPicker(single, category => onSetCategoryForIds(group.items.map(t => t.id), category))}
          </td>
          <td className="py-3 px-4 text-right whitespace-nowrap">
            <span className={`text-sm font-medium ${group.total >= 0 ? 'text-income' : 'text-expense'}`}>
              {group.total >= 0 ? '+' : '-'}{formatCurrency(Math.abs(group.total), currency)}
            </span>
          </td>
        </tr>
        {!isCollapsed && group.items.map(renderRow)}
      </Fragment>
    )
  }

  const renderRow = (tx: Transaction) => (
                <tr
                  key={tx.id}
                  className={`
                    group border-b border-midnight-800 hover:bg-midnight-800/50 transition-colors
                    ${selectedIds.has(tx.id) ? 'bg-midnight-800/30' : ''}
                    ${tx.isExcluded ? 'opacity-50' : ''}
                  `}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      aria-label={`Select ${tx.merchant || tx.recipient || tx.description.slice(0, 30)}`}
                      onChange={() => handleToggleSelect(tx.id)}
                      className="rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
                    />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-sm text-midnight-300">{formatDate(tx.date)}</span>
                  </td>
                  <td className="py-3 px-4 max-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm text-white truncate" title={displayNameOf(tx)}>
                          {displayNameOf(tx)}
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
                        {tx.splitOf ? (
                          <button
                            onClick={() => onUnsplit(tx.splitOf!)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                            title="Part of a split. Click to undo the split"
                          >
                            <Undo2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Split</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSplitting(tx)}
                            className="p-1 rounded text-midnight-500 hover:text-white hover:bg-midnight-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            title="Split across categories"
                            aria-label={`Split ${displayNameOf(tx)}`}
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 relative">
                    <button
                      aria-haspopup="listbox"
                      aria-expanded={editingId === tx.id}
                      aria-label={`Category: ${tx.category || 'Other'}. Change category`}
                      onClick={(e) => openPicker(tx.id, e.currentTarget)}
                      className={`
                        flex items-center gap-2 h-8 px-3 max-w-full rounded-lg text-sm whitespace-nowrap transition-all
                        ${editingId === tx.id 
                          ? 'bg-accent/20 ring-2 ring-accent' 
                          : 'hover:bg-midnight-700'
                        }
                      `}
                      style={{ 
                        backgroundColor: editingId !== tx.id ? `${getCategoryColor(tx.category || 'Other')}20` : undefined
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: getCategoryColor(tx.category || 'Other') }}
                      />
                      <span className="text-midnight-100 truncate">{tx.category || 'Other'}</span>
                      {tx.categorySource === 'ai' && (
                        <RefreshCw className="w-3 h-3 text-accent shrink-0" />
                      )}
                      <ChevronDown className="w-3 h-3 text-midnight-400 shrink-0 ml-auto" />
                    </button>

                    {editingId === tx.id && renderPicker(tx.category, category => onUpdateTransaction(tx.id, { category }))}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </span>
                    {tx.originalAmount !== undefined && tx.originalCurrency && (
                      <span className="block text-xs text-midnight-500">{formatCurrency(tx.originalAmount, tx.originalCurrency)}</span>
                    )}
                  </td>
                </tr>
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

      {splitting && (
        <SplitDialog
          transaction={splitting}
          onCancel={() => setSplitting(null)}
          onSave={(parts) => {
            onSplit(splitting.id, parts)
            setSplitting(null)
          }}
        />
      )}

      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-lg bg-midnight-800 p-1 text-sm">
          {([['list', 'List', List], ['merchant', 'By merchant', Layers]] as const).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                viewMode === mode ? 'bg-midnight-600 text-white' : 'text-midnight-300 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto md:overflow-visible">
        <table className="w-full table-fixed min-w-[640px]">
          <thead>
            <tr className="border-b border-midnight-700">
              <th className="py-3 px-4 w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === transactions.length && transactions.length > 0}
                  aria-label="Select all"
                  onChange={onSelectAll}
                  className="rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
                />
              </th>
              <th className="py-3 px-4 w-28 text-left text-sm font-medium text-midnight-400">
                <SortButton field="date">Date</SortButton>
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-midnight-400">
                <SortButton field="description">Description</SortButton>
              </th>
              <th className="py-3 px-4 w-56 text-left text-sm font-medium text-midnight-400">
                <SortButton field="category">Category</SortButton>
              </th>
              <th className="py-3 px-4 w-32 text-right text-sm font-medium text-midnight-400">
                <SortButton field="amount">Amount</SortButton>
              </th>
            </tr>
          </thead>
            <tbody>
              {viewMode === 'list'
                ? sortedTransactions.slice(0, limit).map(renderRow)
                : visibleGroups.map(renderGroup)}
            </tbody>
        </table>
        </div>

        {hasMore && (
          <div className="p-4 text-center border-t border-midnight-800">
            <button className="btn-secondary text-sm" onClick={() => setLimit(l => l + PAGE)}>
              Show more ({transactions.length - shownRows} remaining)
            </button>
          </div>
        )}

        {transactions.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-midnight-400">No transactions match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
