import Tooltip from '@/shared/components/Tooltip'
import { ArrowLeftRight, BookmarkPlus, MessageSquarePlus, Scissors, Undo2 } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import { displayNameOf } from '@/shared/utils/aliases'
import RecurringBadge from './RecurringBadge'
import type { TableBehaviour } from './transactionTableTypes'

export default function TransactionRowToolbar({
  tx,
  behaviour,
  onMakeRule,
  onNoteOpen,
  noteOpen,
  onUnsplit,
  onStartSplit,
  rowActions,
}: {
  tx: Transaction
  behaviour: TableBehaviour
  onMakeRule?: () => void
  noteOpen: boolean
  onNoteOpen: () => void
  onUnsplit: (parentId: string) => void
  onStartSplit: (tx: Transaction) => void
  rowActions?: TableBehaviour['rowActions']
}) {
  return (
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
      {rowActions?.(tx)}
      {onMakeRule && (
        <Tooltip label="Make a rule from this row">
          <button
            onClick={onMakeRule}
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
            onClick={onNoteOpen}
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
  )
}
