import { List, Layers } from 'lucide-react'
import BulkActionBar from './BulkActionBar'
import SplitDialog from './SplitDialog'
import TransactionTableHead from './TransactionTableHead'
import TransactionTableRow from './TransactionTableRow'
import MerchantGroupRow from './MerchantGroupRow'
import { useTransactionTableState } from './useTransactionTableState'
import type { TransactionTableProps, SortField, SortDirection } from './transactionTableTypes'

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
  viewMode: controlledViewMode,
  onViewModeChange,
  hideViewToggle,
}: TransactionTableProps) {
  const state = useTransactionTableState(
    transactions,
    selectedIds,
    onSelectionChange,
    controlledViewMode,
    onViewModeChange,
  )

  const rowProps = {
    selectedIds,
    currency,
    editingId: state.editingId,
    pickerPos: state.pickerPos,
    dropdownRef: state.dropdownRef,
    categorySearch: state.categorySearch,
    setCategorySearch: state.setCategorySearch,
    activeIndex: state.activeIndex,
    setActiveIndex: state.setActiveIndex,
    filteredCategories: state.filteredCategories,
    onToggleSelect: state.handleToggleSelect,
    onOpenPicker: state.openPicker,
    onClosePicker: state.closePicker,
    onUpdateTransaction,
    onUnsplit,
    onStartSplit: state.setSplitting,
  }

  return (
    <div className="relative">
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => onSelectionChange(new Set())}
          onCategoryChange={onBulkCategoryChange}
          onExclude={onBulkExclude}
          onInclude={onBulkInclude}
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
        <select
          id="sort-by"
          className="input py-1.5 text-sm"
          value={`${state.sortField}:${state.sortDirection}`}
          onChange={e => {
            const [field, dir] = e.target.value.split(':')
            state.setSortField(field as SortField)
            state.setSortDirection(dir as SortDirection)
          }}
        >
          <option value="date:desc">Newest first</option>
          <option value="date:asc">Oldest first</option>
          <option value="amount:desc">Largest first</option>
          <option value="amount:asc">Smallest first</option>
          <option value="description:asc">Name A–Z</option>
          <option value="category:asc">Category</option>
        </select>
      </div>

      <div className={`flex justify-end mb-2 ${hideViewToggle ? 'hidden' : ''}`}>
        <div className="inline-flex rounded-lg bg-midnight-800 p-1 text-sm">
          {(
            [
              ['list', 'List', List],
              ['merchant', 'By merchant', Layers],
            ] as const
          ).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => state.setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                state.viewMode === mode ? 'bg-midnight-600 text-white' : 'text-midnight-300 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden md:overflow-visible">
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
                ? state.sortedTransactions
                    .slice(0, state.limit)
                    .map(tx => <TransactionTableRow key={tx.id} tx={tx} {...rowProps} />)
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
                      pickerPos={state.pickerPos}
                      dropdownRef={state.dropdownRef}
                      categorySearch={state.categorySearch}
                      setCategorySearch={state.setCategorySearch}
                      activeIndex={state.activeIndex}
                      setActiveIndex={state.setActiveIndex}
                      filteredCategories={state.filteredCategories}
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
          <div className="p-4 text-center border-t border-midnight-800">
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
