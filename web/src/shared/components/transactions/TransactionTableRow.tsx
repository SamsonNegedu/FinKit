import { useState } from 'react'
import { transferDetail } from '@/shared/utils/transferDetail'
import { ChevronDown } from 'lucide-react'
import Tooltip from '@/shared/components/Tooltip'
import { Transaction } from '@/shared/types'
import type { RuleMatch } from '@/shared/utils/categorizer'
import { getCategoryColor } from '@/shared/utils/categorizer'
import TransactionRowToolbar from './TransactionRowToolbar'
import TransactionNote from './TransactionNote'
import { displayNameOf } from '@/shared/utils/aliases'
import { shopBehindProcessor } from '@/shared/utils/merchantFromDescription'
import { formatCurrency } from '@/shared/utils/format'
import { formatTransactionDate } from './transactionTableTypes'
import CategoryPopover, { type PickScope } from './CategoryPopover'
import MakeRuleDialog from './MakeRuleDialog'
import CountsToMonth from './CountsToMonth'
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
  onMakeRule?: (match: RuleMatch, category: string, detail?: string) => void
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
  const platform = shopBehindProcessor(tx) ? tx.recipient : undefined
  const transfer = transferDetail(tx)
  const colorOf = behaviour.colorOf ?? getCategoryColor
  const [noteOpen, setNoteOpen] = useState(false)
  const [ruleFor, setRuleFor] = useState<{ category: string; detail?: string } | null>(null)
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
      <td className="py-2.5 px-4 whitespace-nowrap max-md:col-start-3 max-md:row-start-2 max-md:py-0 max-md:px-3 max-md:text-right">
        <div className="flex items-center gap-1.5 max-md:justify-end">
          <span className="text-sm text-midnight-300 max-md:text-xs">{formatTransactionDate(tx.date, showYear)}</span>
          {!behaviour.noSplit && <CountsToMonth tx={tx} onChange={updates => onUpdateTransaction(tx.id, updates)} />}
        </div>
      </td>
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a table cell, not a control */}
      <td className="py-2.5 px-4 max-w-0 max-md:max-w-none max-md:col-start-2 max-md:row-start-1 max-md:py-1 max-md:px-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* The bank's own text is a hover away: one line per row keeps a long list scannable */}
            <Tooltip label={tx.description}>
              <span className="flex items-baseline gap-2 min-w-0 text-sm">
                <span className="text-ink truncate shrink-0 max-w-full">{displayNameOf(tx)}</span>
                {/* The processor stays visible: "Apple · PayPal" says how it was paid, not just what */}
                {platform && <span className="text-midnight-500 truncate min-w-0">· {platform}</span>}
              </span>
            </Tooltip>
            <TransactionNote
              note={tx.note}
              open={noteOpen}
              onOpen={() => setNoteOpen(true)}
              onClose={() => setNoteOpen(false)}
              onSave={note => onUpdateTransaction(tx.id, { note })}
            />
            {transfer && <span className="block truncate text-xs text-midnight-500">{transfer}</span>}
            {behaviour.meta?.(tx)}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <TransactionRowToolbar
              tx={tx}
              behaviour={behaviour}
              noteOpen={noteOpen}
              onNoteOpen={() => setNoteOpen(true)}
              onMakeRule={
                onMakeRule
                  ? () => setRuleFor({ category: tx.category || 'Other', detail: tx.categoryDetail })
                  : undefined
              }
              rowActions={behaviour.rowActions}
              onUnsplit={onUnsplit}
              onStartSplit={onStartSplit}
            />
          </div>
        </div>
      </td>
      <td className="py-2.5 px-4 relative max-md:col-start-2 max-md:row-start-2 max-md:py-0 max-md:px-3">
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
              setRuleFor({ category, detail: detail || undefined })
            }
          }}
          scopes={scopes}
          colorOf={colorOf}
          trigger={
            <button
              aria-label={`Category: ${tx.category || 'Other'}. Change category`}
              className={`
                        flex items-center gap-2 h-8 -mx-2 px-2 max-w-full rounded-lg text-sm whitespace-nowrap transition-colors
                        ${editingId === tx.id ? 'bg-accent/20 ring-2 ring-accent' : 'hover:bg-midnight-700'}
                      `}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorOf(tx.category || 'Other') }}
              />
              <span className="text-midnight-100 truncate">
                {tx.category || 'Other'}
                {!behaviour.categoryNote && tx.categoryDetail && (
                  <span className="text-midnight-400"> · {tx.categoryDetail}</span>
                )}
              </span>
              <ChevronDown className="w-3 h-3 text-midnight-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          }
        />
        {behaviour.categoryNote?.(tx)}
        {ruleFor && onMakeRule && (
          <MakeRuleDialog
            tx={tx}
            category={ruleFor.category}
            detail={ruleFor.detail}
            currency={currency}
            onSave={match => onMakeRule(match, ruleFor.category, ruleFor.detail)}
            onClose={() => setRuleFor(null)}
          />
        )}
      </td>
      <td className="py-2.5 px-4 text-right whitespace-nowrap max-md:col-start-3 max-md:row-start-1 max-md:py-1 max-md:px-3">
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
