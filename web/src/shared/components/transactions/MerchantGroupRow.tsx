import Tooltip from '@/shared/components/Tooltip'
import { Fragment } from 'react'
import { ChevronDown, ChevronRight, ArrowUpRight, Pencil } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { formatCurrency } from '@/shared/utils/format'
import type { MerchantGroup } from './transactionTableTypes'
import CategoryPopover from './CategoryPopover'
import CategoryIcon from '@/shared/components/CategoryIcon'
import TransactionTableRow, { type TransactionTableRowProps } from './TransactionTableRow'

export interface MerchantGroupRowProps {
  group: MerchantGroup
  currency: string
  collapsed: Set<string>
  setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>
  renamingKey: string | null
  setRenamingKey: (key: string | null) => void
  editingId: string | null
  categories: string[]
  onOpenPicker: (id: string) => void
  onClosePicker: () => void
  onRenameMerchant: (merchantKey: string, name: string) => void
  onSetCategoryForIds: (ids: string[], category: string) => void
  rowProps: Omit<TransactionTableRowProps, 'tx'>
}

export default function MerchantGroupRow({
  group,
  currency,
  collapsed,
  setCollapsed,
  renamingKey,
  setRenamingKey,
  editingId,
  categories,
  onOpenPicker,
  onClosePicker,
  onRenameMerchant,
  onSetCategoryForIds,
  rowProps,
}: MerchantGroupRowProps) {
  const isCollapsed = collapsed.has(group.key)
  const pickerId = `group:${group.key}`
  const mixed = group.categories.size > 1
  const single = mixed ? undefined : [...group.categories][0]
  const shownName = group.items.find(t => t.displayName)?.displayName || group.key

  return (
    <Fragment key={group.key}>
      <tr className="border-b border-line-strong bg-midnight-800/40 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center">
        {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a table cell, not a control */}
        <td className="py-3 px-4 max-md:hidden" />
        <td colSpan={2} className="py-3 px-4 max-md:col-start-1 max-md:row-start-1 max-md:py-2 max-md:px-3">
          {renamingKey === group.key ? (
            <input
              autoFocus
              defaultValue={shownName}
              aria-label={`Rename ${group.key}`}
              className="input py-1 text-sm w-64"
              onKeyDown={e => {
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

                    if (next.has(group.key)) {
                      next.delete(group.key)
                    } else {
                      next.add(group.key)
                    }

                    return next
                  })
                }
                className="flex items-center gap-2 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-midnight-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-midnight-400" />
                )}
                <span className="text-sm font-medium text-ink truncate">{shownName}</span>
                <span className="text-xs text-midnight-400">{group.items.length}×</span>
              </button>
              <Tooltip label="Rename (only changes how it's shown)">
                <button
                  onClick={() => setRenamingKey(group.key)}
                  className="p-1 text-midnight-500 hover:text-ink"
                  aria-label={`Rename ${shownName}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip label="Open this merchant">
                <Link
                  to="/transactions/merchants/$merchantKey"
                  params={{ merchantKey: group.key }}
                  className="p-1 text-midnight-500 hover:text-ink"
                  aria-label={`Open ${shownName}`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Tooltip>
            </div>
          )}
        </td>
        <td className="py-3 px-4 relative max-md:col-start-1 max-md:row-start-2 max-md:py-0 max-md:px-3 max-md:pb-2">
          <CategoryPopover
            open={editingId === pickerId}
            onOpenChange={o => (o ? onOpenPicker(pickerId) : onClosePicker())}
            categories={categories}
            current={single}
            onPick={category =>
              onSetCategoryForIds(
                group.items.map(t => t.id),
                category,
              )
            }
            trigger={
              <Tooltip label="Set category for all transactions from this merchant">
                <button className="flex items-center gap-2 h-8 px-3 max-w-full rounded-lg text-sm whitespace-nowrap hover:bg-midnight-700 transition-colors">
                  {single && <CategoryIcon category={single} size="sm" />}
                  <span className="text-midnight-100">{mixed ? 'Mixed' : single}</span>
                  <ChevronDown className="w-3 h-3 text-midnight-400" />
                </button>
              </Tooltip>
            }
          />
        </td>
        <td className="py-3 px-4 text-right whitespace-nowrap max-md:col-start-2 max-md:row-start-1 max-md:py-2 max-md:px-3">
          <span className={`text-sm font-medium ${group.total >= 0 ? 'text-income' : 'text-expense'}`}>
            {group.total >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(group.total), currency)}
          </span>
        </td>
      </tr>
      {!isCollapsed && group.items.map(tx => <TransactionTableRow key={tx.id} tx={tx} {...rowProps} />)}
    </Fragment>
  )
}
