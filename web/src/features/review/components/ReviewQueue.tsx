import { useEffect, useMemo, useReducer } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Transaction } from '@/shared/types'
import { reviewQuickPicks } from './reviewQueueUtils'
import { useReviewQueueKeyboard } from './useReviewQueueKeyboard'
import ReviewQueuePanel from './ReviewQueuePanel'
import { deriveReviewQueuePhase, reviewSessionReducer } from './reviewQueuePhase'

export { needsReview } from './reviewQueueUtils'

interface ReviewQueueProps {
  transactions: Transaction[]
  onBulkUpdate: (ids: string[], updates: Partial<Transaction>) => void
  currency: string
}

export default function ReviewQueue({ transactions, onBulkUpdate, currency }: ReviewQueueProps) {
  const [session, dispatchSession] = useReducer(reviewSessionReducer, {
    skipped: new Set<string>(),
    focusKey: null,
    totalAtStart: null,
  })

  const derived = useMemo(() => deriveReviewQueuePhase(transactions, session), [transactions, session])
  const quickPicks = useMemo(() => reviewQuickPicks(transactions), [transactions])

  useEffect(() => {
    if (derived.groups.length > 0) {
      dispatchSession({ type: 'CAPTURE_TOTAL', count: derived.groups.length })
    }
  }, [derived.groups.length])

  const assign = (category: string) => {
    if (!derived.current) {
      return
    }
    onBulkUpdate(
      derived.current.items.map(t => t.id),
      { category },
    )
  }
  const exclude = () => {
    if (!derived.current) {
      return
    }
    onBulkUpdate(
      derived.current.items.map(t => t.id),
      { isExcluded: true },
    )
  }
  const skip = () => {
    if (!derived.current) {
      return
    }
    dispatchSession({ type: 'SKIP', merchantKey: derived.current.key })
  }

  useReviewQueueKeyboard(quickPicks, assign, skip, exclude)

  if (derived.phase.kind === 'empty') {
    return (
      <div className="card text-center py-12">
        <CheckCircle2 className="w-10 h-10 text-income mx-auto mb-3" />
        <p className="text-ink font-medium">Everything is categorized</p>
        <p className="text-sm text-midnight-400 mt-1">Nothing needs your review.</p>
      </div>
    )
  }

  if (derived.phase.kind === 'all_skipped') {
    return (
      <div className="card text-center py-12">
        <p className="text-ink font-medium">{derived.phase.skippedCount} skipped</p>
        <button className="btn-secondary mt-4" onClick={() => dispatchSession({ type: 'RESET_SKIPPED' })}>
          Review skipped again
        </button>
      </div>
    )
  }

  return (
    <ReviewQueuePanel
      currency={currency}
      current={derived.current!}
      upNext={derived.upNext}
      quickPicks={quickPicks}
      pendingCount={derived.pending.length}
      transactionsLeft={derived.transactionsLeft}
      done={derived.done}
      total={derived.total}
      onAssign={assign}
      onSkip={skip}
      onExclude={exclude}
      onFocusKey={key => dispatchSession({ type: 'FOCUS', merchantKey: key })}
    />
  )
}
