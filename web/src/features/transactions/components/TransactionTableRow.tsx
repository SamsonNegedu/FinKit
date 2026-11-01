import { ChevronDown, ArrowLeftRight, Scissors, Undo2 } from 'lucide-react'
import { Transaction } from '@/shared/types'
import { getCategoryColor } from '@/shared/utils/categorizer'
import RecurringBadge from './RecurringBadge'
import { displayNameOf } from '@/shared/utils/aliases'
import { formatCurrency } from '@/shared/utils/format'
import { formatTransactionDate } from './transactionTableTypes'
import CategoryPickerPortal from './CategoryPickerPortal'

export interface TransactionTableRowProps {
  tx: Transaction
  selectedIds: Set<string>
  currency: string
  editingId: string | null
  pickerPos: { left: number; top?: number; bottom?: number } | null
  dropdownRef: React.RefObject<HTMLDivElement | null>
  categorySearch: string
  setCategorySearch: (value: string) => void
  activeIndex: number
  setActiveIndex: (updater: (i: number) => number) => void
  filteredCategories: string[]
  onToggleSelect: (id: string) => void
  onOpenPicker: (id: string, trigger: HTMLElement) => void
  onClosePicker: () => void
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  onUnsplit: (parentId: string) => void
  onStartSplit: (tx: Transaction) => void
}

export default function TransactionTableRow({
  tx,
  selectedIds,
  currency,
  editingId,
  pickerPos,
  dropdownRef,
  categorySearch,
  setCategorySearch,
  activeIndex,
  setActiveIndex,
  filteredCategories,
  onToggleSelect,
  onOpenPicker,
  onClosePicker,
  onUpdateTransaction,
  onUnsplit,
  onStartSplit,
}: TransactionTableRowProps) {
  return (
    <tr
      className={`
                    group border-b border-midnight-800 hover:bg-midnight-800/50 transition-colors
                    max-md:grid max-md:grid-cols-[44px_minmax(0,1fr)_auto] max-md:items-center max-md:py-2
                    ${selectedIds.has(tx.id) ? 'bg-midnight-800/30' : ''}
                    ${tx.isExcluded ? 'opacity-50' : ''}
                  `}
    >
      <td className="relative p-0 max-md:col-start-1 max-md:row-start-1 max-md:row-span-2 max-md:self-stretch">
        <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-midnight-700/40">
          <input
            type="checkbox"
            checked={selectedIds.has(tx.id)}
            aria-label={`Select ${tx.merchant || tx.recipient || tx.description.slice(0, 30)}`}
            onChange={() => onToggleSelect(tx.id)}
            className="w-5 h-5 cursor-pointer rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
          />
        </label>
      </td>
      <td className="py-3 px-4 whitespace-nowrap max-md:col-start-3 max-md:row-start-2 max-md:py-0 max-md:px-3 max-md:text-right">
        <span className="text-sm text-midnight-300 max-md:text-xs">{formatTransactionDate(tx.date)}</span>
      </td>
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a table cell, not a control */}
      <td className="py-3 px-4 max-w-0 max-md:max-w-none max-md:col-start-2 max-md:row-start-1 max-md:py-1 max-md:px-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm text-white truncate" title={displayNameOf(tx)}>
              {displayNameOf(tx)}
            </p>
            <p className="text-xs text-midnight-500 truncate" title={tx.description}>
              {tx.description}
            </p>
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
                onClick={() => onStartSplit(tx)}
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
      <td className="py-3 px-4 relative max-md:col-start-2 max-md:row-start-2 max-md:py-0 max-md:px-3">
        <button
          aria-haspopup="listbox"
          aria-expanded={editingId === tx.id}
          aria-label={`Category: ${tx.category || 'Other'}. Change category`}
          onClick={e => onOpenPicker(tx.id, e.currentTarget)}
          className={`
                        flex items-center gap-2 h-8 px-3 max-w-full rounded-lg text-sm whitespace-nowrap transition-all
                        ${editingId === tx.id ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-midnight-700'}
                      `}
          style={{
            backgroundColor: editingId !== tx.id ? `${getCategoryColor(tx.category || 'Other')}20` : undefined,
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: getCategoryColor(tx.category || 'Other') }}
          />
          <span className="text-midnight-100 truncate">{tx.category || 'Other'}</span>
          <ChevronDown className="w-3 h-3 text-midnight-400 shrink-0 ml-auto" />
        </button>

        {editingId === tx.id && pickerPos && (
          <CategoryPickerPortal
            dropdownRef={dropdownRef}
            pickerPos={pickerPos}
            categorySearch={categorySearch}
            onCategorySearchChange={setCategorySearch}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            filteredCategories={filteredCategories}
            current={tx.category}
            onPick={category => onUpdateTransaction(tx.id, { category })}
            onClose={onClosePicker}
          />
        )}
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap max-md:col-start-3 max-md:row-start-1 max-md:py-1 max-md:px-3">
        <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
          {tx.type === 'income' ? '+' : '-'}
          {formatCurrency(tx.amount, currency)}
        </span>
        {tx.originalAmount !== undefined && tx.originalCurrency && (
          <span className="block text-xs text-midnight-500">
            {formatCurrency(tx.originalAmount, tx.originalCurrency)}
          </span>
        )}
      </td>
    </tr>
  )
}
