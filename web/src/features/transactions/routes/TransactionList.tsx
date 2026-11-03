import { useState } from 'react'
import MoveToTripDialog from '@/features/trips/components/MoveToTripDialog'
import TransactionTable from '@/shared/components/transactions/TransactionTable'
import { Transaction } from '@/shared/types'
import { useApp } from '@/shared/contexts/AppState'
import { useSelection } from '@/features/transactions/hooks/useSelection'

interface Props {
  transactions: Transaction[]
  viewMode?: 'list' | 'merchant'
  onViewModeChange?: (mode: 'list' | 'merchant') => void
}

/** The transaction table wired to the app's edits. Used wherever transactions are listed. */
export default function TransactionList({ transactions, viewMode, onViewModeChange }: Props) {
  const app = useApp()
  const selection = useSelection(transactions, app.bulkUpdate)
  const [movingToTrip, setMovingToTrip] = useState(false)

  return (
    <>
      <TransactionTable
        transactions={transactions}
        selectedIds={selection.selectedIds}
        onSelectionChange={selection.setSelectedIds}
        onSelectAll={selection.selectAll}
        onUpdateTransaction={app.updateTransaction}
        onBulkCategoryChange={selection.setCategory}
        onMakeRule={app.makeRule}
        onSetCategoryForIds={(ids, category, detail) =>
          app.bulkUpdate(ids, { category, categoryDetail: detail || undefined })
        }
        onBulkExclude={selection.exclude}
        onBulkInclude={selection.include}
        // Only bank-synced transactions can join a trip, so the action is offered once some exist
        onMoveToTrip={app.tripLinks.refByKey.size > 0 ? () => setMovingToTrip(true) : undefined}
        onSplit={app.split}
        onUnsplit={app.unsplit}
        onRenameMerchant={app.renameMerchant}
        currency={app.baseCurrency}
        behaviour={{
          detailsOf: category => app.categoryList.details?.[category] ?? [],
          onAddDetail: app.addCategoryDetail,
        }}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      {movingToTrip && (
        <MoveToTripDialog
          transactions={transactions.filter(t => selection.selectedIds.has(t.id))}
          onClose={() => setMovingToTrip(false)}
          onDone={() => {
            setMovingToTrip(false)
            selection.setSelectedIds(new Set())
          }}
        />
      )}
    </>
  )
}
