import Tooltip from '@/shared/components/Tooltip'
import { useState } from 'react'
import { ChevronDown, ArrowLeftRight, BookmarkPlus, MessageSquarePlus, Scissors, Undo2 } from 'lucide-react'
import { Transaction } from '@/shared/types'
import type { RuleMatch } from '@/shared/utils/categorizer'
import { getCategoryColor } from '@/shared/utils/categorizer'
import RecurringBadge from './RecurringBadge'
import TransactionNote from './TransactionNote'
import { displayNameOf } from '@/shared/utils/aliases'
import { formatCurrency } from '@/shared/utils/format'
import { formatTransactionDate } from './transactionTableTypes'
import CategoryPopover, { type PickScope } from './CategoryPopover'
import MakeRuleDialog from './MakeRuleDialog'
import CountsToMonth from './CountsToMonth'
import CategoryIcon from '@/shared/components/CategoryIcon'
import type { TableBehaviour } from './transactionTableTypes'
import Checkbox from '@/shared/components/forms/Checkbox'

export interface TransactionTableRowProps {
  tx: Transaction
  selectedIds: Set<string>
  currency: string
  editingId: string | null
  categories: string[]
  onToggleSelect: (id: string) => void
  onOpenPicker: (id: string) => void
  onClosePicker: () => void
  onUpdateTransaction: (id: string, updates: Partial<Transaction>, onlyThis?: boolean) => void
  /** True when other transactions share this one's merchant, so "Only this one" means something */
  hasSiblings?: (tx: Transaction) => boolean
  /** The list spans several years, so dates carry theirs */
  showYear?: boolean
  /** Makes a rule from a transaction. Without it the picker offers no rule */
  onMakeRule?: (match: RuleMatch, category: string) => void
  onUnsplit: (parentId: string) => void
  onStartSplit: (tx: Transaction) => void
  behaviour?: TableBehaviour
}

export default function TransactionTableRow({
  tx,
  selectedIds,
  currency,
  editingId,
  categories,
  onToggleSelect,
  onOpenPicker,
  onClosePicker,
  onUpdateTransaction,
  hasSiblings,
  showYear = false,
  onMakeRule,
  onUnsplit,
  onStartSplit,
  behaviour = {},
}: TransactionTableRowProps) {
  const colorOf = behaviour.colorOf ?? getCategoryColor
  const [noteOpen, setNoteOpen] = useState(false)
  const [ruleFor, setRuleFor] = useState<string | null>(null)
  const scopes: PickScope[] | undefined = hasSiblings?.(tx)
    ? ['one', ...(onMakeRule ? (['rule'] as const) : [])]
    : undefined

  return (
    <tr
      className={`
                    group border-b border-line hover:bg-midnight-800/50 transition-colors
                    max-md:grid max-md:grid-cols-[44px_minmax(0,1fr)_auto] max-md:items-center max-md:py-2
                    ${selectedIds.has(tx.id) ? 'bg-midnight-800/30' : ''}
                    ${tx.isExcluded ? 'opacity-50' : ''}
                  `}
    >
      <td className="relative p-0 max-md:col-start-1 max-md:row-start-1 max-md:row-span-2 max-md:self-stretch">
        <label
          aria-label={`Select ${tx.merchant || tx.recipient || tx.description.slice(0, 30)}`}
          className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-midnight-700/40"
        >
          <Checkbox
            checked={selectedIds.has(tx.id)}
            ariaLabel={`Select ${tx.merchant || tx.recipient || tx.description.slice(0, 30)}`}
            onChange={() => onToggleSelect(tx.id)}
          />
        </label>
      </td>
      <td className="py-3 px-4 whitespace-nowrap max-md:col-start-3 max-md:row-start-2 max-md:py-0 max-md:px-3 max-md:text-right">
        <div className="flex items-center gap-1.5 max-md:justify-end">
          <span className="text-sm text-midnight-300 max-md:text-xs">{formatTransactionDate(tx.date, showYear)}</span>
          {!behaviour.noSplit && <CountsToMonth tx={tx} onChange={updates => onUpdateTransaction(tx.id, updates)} />}
        </div>
      </td>
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a table cell, not a control */}
      <td className="py-3 px-4 max-w-0 max-md:max-w-none max-md:col-start-2 max-md:row-start-1 max-md:py-1 max-md:px-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm text-ink truncate" title={displayNameOf(tx)}>
              {displayNameOf(tx)}
            </p>
            <p className="text-xs text-midnight-500 truncate" title={tx.description}>
              {tx.description}
            </p>
            <TransactionNote
              note={tx.note}
              open={noteOpen}
              onOpen={() => setNoteOpen(true)}
              onClose={() => setNoteOpen(false)}
              onSave={note => onUpdateTransaction(tx.id, { note })}
            />
            {behaviour.meta?.(tx)}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {tx.isExcluded && !tx.doubleBookingMatch && (
              <Tooltip label="Excluded from totals">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warning/20 text-warning border border-warning/30">
                  <span className="hidden sm:inline">Excluded</span>
                </span>
              </Tooltip>
            )}
            {tx.doubleBookingMatch && (
              <Tooltip label={`Internal transfer - ${tx.isExcluded ? 'excluded from totals' : 'counted in totals'}`}>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-info/20 text-info border border-info/30">
                  <ArrowLeftRight className="w-3 h-3" />
                  <span className="hidden sm:inline">Transfer</span>
                </span>
              </Tooltip>
            )}
            {tx.isRecurring && <RecurringBadge frequency={tx.recurringFrequency} />}
            {behaviour.rowActions?.(tx)}
            {onMakeRule && (
              <Tooltip label="Make a rule from this row">
                <button
                  onClick={() => setRuleFor(tx.category || 'Other')}
                  className="p-1 rounded text-midnight-500 hover:text-ink hover:bg-midnight-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label={`Make a rule from ${displayNameOf(tx)}`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            )}
            {!tx.note && !noteOpen && (
              <Tooltip label="Add a note">
                <button
                  onClick={() => setNoteOpen(true)}
                  className="p-1 rounded text-midnight-500 hover:text-ink hover:bg-midnight-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label={`Add a note to ${displayNameOf(tx)}`}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            )}
            {behaviour.noSplit ? null : tx.splitOf ? (
              <Tooltip label="Part of a split. Click to undo the split">
                <button
                  onClick={() => onUnsplit(tx.splitOf!)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <Undo2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Split</span>
                </button>
              </Tooltip>
            ) : (
              <Tooltip label="Split across categories">
                <button
                  onClick={() => onStartSplit(tx)}
                  className="p-1 rounded text-midnight-500 hover:text-ink hover:bg-midnight-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label={`Split ${displayNameOf(tx)}`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 relative max-md:col-start-2 max-md:row-start-2 max-md:py-0 max-md:px-3">
        <CategoryPopover
          open={editingId === tx.id}
          onOpenChange={o => (o ? onOpenPicker(tx.id) : onClosePicker())}
          categories={categories}
          current={tx.category}
          currentDetail={tx.categoryDetail}
          merchantName={displayNameOf(tx)}
          detailsOf={behaviour.detailsOf}
          canAddDetail={behaviour.canAddDetail}
          onAddDetail={behaviour.onAddDetail}
          onPick={(category, scope, detail) => {
            if (detail !== undefined && behaviour.onPickDetail) {
              behaviour.onPickDetail(tx.id, category, detail)

              return
            }
            onUpdateTransaction(
              tx.id,
              detail === undefined ? { category } : { category, categoryDetail: detail || undefined },
              scope !== 'all',
            )
            if (scope === 'rule') {
              setRuleFor(category)
            }
          }}
          scopes={scopes}
          colorOf={colorOf}
          trigger={
            <button
              aria-label={`Category: ${tx.category || 'Other'}. Change category`}
              className={`
                        flex items-center gap-2 h-8 px-3 max-w-full rounded-lg text-sm whitespace-nowrap transition-all
                        ${editingId === tx.id ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-midnight-700'}
                      `}
              style={{
                backgroundColor: editingId !== tx.id ? `${colorOf(tx.category || 'Other')}20` : undefined,
              }}
            >
              <CategoryIcon category={tx.category} color={colorOf(tx.category || 'Other')} size="sm" />
              <span className="text-midnight-100 truncate">{tx.category || 'Other'}</span>
              <ChevronDown className="w-3 h-3 text-midnight-400 shrink-0 ml-auto" />
            </button>
          }
        />
        {behaviour.categoryNote?.(tx)}
        {!behaviour.categoryNote && tx.categoryDetail && (
          <span className="block truncate px-3 text-xs text-midnight-400 max-md:hidden">{tx.categoryDetail}</span>
        )}
        {ruleFor && onMakeRule && (
          <MakeRuleDialog
            tx={tx}
            category={ruleFor}
            currency={currency}
            onSave={match => onMakeRule(match, ruleFor)}
            onClose={() => setRuleFor(null)}
          />
        )}
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap max-md:col-start-3 max-md:row-start-1 max-md:py-1 max-md:px-3">
        <span className={`text-sm font-medium ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
          {tx.type === 'income' ? '+' : '-'}
          {formatCurrency(tx.amount, tx.currency || currency)}
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
