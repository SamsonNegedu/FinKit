import TransactionTable from '../components/TransactionTable'
import { Transaction } from '@/shared/types'
import { useApp } from '@/shared/contexts/AppState'
import { useSelection } from '@/features/transactions/hooks/useSelection'

interface Props {
  transactions: Transaction[]
  viewMode?: 'list' | 'merchant'
  onViewModeChange?: (mode: 'list' | 'merchant') => void
  hideViewToggle?: boolean
}

/** The transaction table wired to the app's edits. Used wherever transactions are listed. */
export default function TransactionList({ transactions, viewMode, onViewModeChange, hideViewToggle }: Props) {
  const app = useApp()
  const selection = useSelection(transactions, app.bulkUpdate)

  return (
    <TransactionTable
      transactions={transactions}
      selectedIds={selection.selectedIds}
      onSelectionChange={selection.setSelectedIds}
      onSelectAll={selection.selectAll}
      onUpdateTransaction={app.updateTransaction}
      onBulkCategoryChange={selection.setCategory}
      onSetCategoryForIds={(ids, category) => app.bulkUpdate(ids, { category })}
      onBulkExclude={selection.exclude}
      onBulkInclude={selection.include}
      onSplit={app.split}
      onUnsplit={app.unsplit}
      onRenameMerchant={app.renameMerchant}
      currency={app.baseCurrency}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      hideViewToggle={hideViewToggle}
    />
  )
}
