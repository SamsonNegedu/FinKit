import { Fragment, useMemo } from 'react'
import { merchantKeyOf, normalizeMerchant } from '@/shared/utils/categorizer'
import type { Transaction } from '@/shared/types'
import { selectionTotals } from '@/shared/utils/selectionTotal'
import { addMoney } from '@/shared/utils/money'
import { signedTransactionAmount } from '@/shared/utils/transactionAmount'
import BulkActionBar from './BulkActionBar'
import SplitDialog from './SplitDialog'
import TransactionTableHead from './TransactionTableHead'
import TransactionTableRow from './TransactionTableRow'
import MerchantGroupRow from './MerchantGroupRow'
import MonthHeaderRow from './MonthHeaderRow'
import { useTransactionTableState } from './useTransactionTableState'
import type { TransactionTableProps, SortField, SortDirection } from './transactionTableTypes'
import Select from '@/shared/components/forms/Select'

const noop = () => {}

export default function TransactionTable({
  transactions,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  onUpdateTransaction,
  onBulkCategoryChange,
  onSetCategoryForIds,
  onMakeRule,
  onBulkExclude,
  onBulkInclude,
  onMoveToTrip,
  onAddToContracts,
  onSplit = noop,
  onUnsplit = noop,
  onRenameMerchant = noop,
  currency,
  viewMode: controlledViewMode,
  onViewModeChange,
  behaviour = {},
}: TransactionTableProps) {
  const state = useTransactionTableState(
    transactions,
    selectedIds,
    onSelectionChange,
    controlledViewMode,
    onViewModeChange,
    behaviour.categories,
  )

  const merchantCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const t of transactions) {
      const key = normalizeMerchant(merchantKeyOf(t))

      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return counts
  }, [transactions])
  const hasSiblings = (tx: Transaction) => (merchantCounts.get(normalizeMerchant(merchantKeyOf(tx))) ?? 0) > 1

  const selected = useMemo(
    () => selectionTotals(transactions, selectedIds, currency),
    [transactions, selectedIds, currency],
  )
  const showYear = useMemo(() => new Set(transactions.map(t => t.date.slice(0, 4))).size > 1, [transactions])
  // Month dividers only make sense when the list runs in date order
  const monthly = state.viewMode === 'list' && state.sortField === 'date'
  const months = useMemo(() => {
    const byMonth = new Map<string, { count: number; net: number }>()

    for (const t of state.sortedTransactions.slice(0, state.limit)) {
      const m = byMonth.get(t.date.slice(0, 7)) ?? { count: 0, net: 0 }

      m.count += 1
      m.net = addMoney(m.net, signedTransactionAmount(t))
      byMonth.set(t.date.slice(0, 7), m)
    }

    return byMonth
  }, [state.sortedTransactions, state.limit])
  const rowProps = {
    selectedIds,
    currency,
    editingId: state.editingId,
    categories: state.categories,
    onToggleSelect: state.handleToggleSelect,
    onOpenPicker: state.openPicker,
    onClosePicker: state.closePicker,
    onUpdateTransaction,
    hasSiblings,
    showYear,
    onMakeRule,
    onUnsplit,
    onStartSplit: state.setSplitting,
    behaviour,
  }

  return (
    <div className="relative">
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totals={selected}
          rangeHint={state.viewMode === 'list'}
          rangeArmed={state.rangeArmed}
          onArmRange={state.armRange}
          onClearSelection={() => onSelectionChange(new Set())}
          onCategoryChange={onBulkCategoryChange}
          onExclude={onBulkExclude}
          onInclude={onBulkInclude}
          onMoveToTrip={onMoveToTrip}
          onAddToContracts={onAddToContracts}
          categories={behaviour.categories}
          colorOf={behaviour.colorOf}
          detailsOf={behaviour.detailsOf}
          canAddDetail={behaviour.canAddDetail}
          onAddDetail={behaviour.onAddDetail}
          extra={behaviour.bulkActions?.([...selectedIds])}
        />
      )}

      {state.splitting && (
        <SplitDialog
          transaction={state.splitting}
          onCancel={() => state.setSplitting(null)}
          onSave={parts => {
            onSplit(state.splitting!.id, parts)
            state.setSplitting(null)
          }}
        />
      )}

      <div className="md:hidden flex items-center gap-2 mb-2 text-sm">
        <label htmlFor="sort-by" className="text-midnight-400">
          Sort
        </label>
        <Select
          id="sort-by"
          className="py-1.5 text-sm"
          value={`${state.sortField}:${state.sortDirection}`}
          onChange={value => {
            const [field, dir] = value.split(':')

            state.setSortField(field as SortField)
            state.setSortDirection(dir as SortDirection)
          }}
          options={[
            { value: 'date:desc', label: 'Newest first' },
            { value: 'date:asc', label: 'Oldest first' },
            { value: 'amount:desc', label: 'Largest first' },
            { value: 'amount:asc', label: 'Smallest first' },
            { value: 'description:asc', label: 'Name A–Z' },
            { value: 'category:asc', label: 'Category' },
          ]}
        />
      </div>

      <div className="overflow-hidden md:overflow-visible">
        <div className="overflow-x-auto md:overflow-visible">
          <table className="w-full md:table-fixed md:min-w-[640px] max-md:block">
            <TransactionTableHead
              allSelected={selectedIds.size === transactions.length && transactions.length > 0}
              onSelectAll={onSelectAll}
              sortField={state.sortField}
              onSort={state.handleSort}
            />
            <tbody className="max-md:block">
              {state.viewMode === 'list'
                ? state.sortedTransactions.slice(0, state.limit).map((tx, i, rows) => {
                    const month = tx.date.slice(0, 7)
                    const first = monthly && (i === 0 || rows[i - 1].date.slice(0, 7) !== month)

                    return (
                      <Fragment key={tx.id}>
                        {first && <MonthHeaderRow month={month} currency={currency} {...months.get(month)!} />}
                        <TransactionTableRow tx={tx} {...rowProps} />
                      </Fragment>
                    )
                  })
                : state.visibleGroups.map(group => (
                    <MerchantGroupRow
                      key={group.key}
                      group={group}
                      currency={currency}
                      collapsed={state.collapsed}
                      setCollapsed={state.setCollapsed}
                      renamingKey={state.renamingKey}
                      setRenamingKey={state.setRenamingKey}
                      editingId={state.editingId}
                      categories={state.categories}
                      onOpenPicker={state.openPicker}
                      onClosePicker={state.closePicker}
                      onRenameMerchant={onRenameMerchant}
                      onSetCategoryForIds={onSetCategoryForIds}
                      rowProps={rowProps}
                    />
                  ))}
            </tbody>
          </table>
        </div>

        {state.hasMore && (
          <div className="p-4 text-center border-t border-line">
            <button className="btn-secondary text-sm" onClick={() => state.setLimit(l => l + state.PAGE)}>
              Show more ({transactions.length - state.shownRows} remaining)
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
