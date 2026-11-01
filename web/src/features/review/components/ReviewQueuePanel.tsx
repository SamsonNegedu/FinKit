import { SkipForward, EyeOff } from 'lucide-react'
import { formatCurrency } from '@/shared/utils/format'
import { getCategoryColor } from '@/shared/utils/categorizer'
import type { ReviewGroup } from './reviewQueueUtils'

interface ReviewQueuePanelProps {
  currency: string
  current: ReviewGroup
  upNext: ReviewGroup[]
  quickPicks: string[]
  pendingCount: number
  transactionsLeft: number
  done: number
  total: number
  onAssign: (category: string) => void
  onSkip: () => void
  onExclude: () => void
  onFocusKey: (key: string) => void
}

export default function ReviewQueuePanel({
  currency,
  current,
  upNext,
  quickPicks,
  pendingCount,
  transactionsLeft,
  done,
  total,
  onAssign,
  onSkip,
  onExclude,
  onFocusKey,
}: ReviewQueuePanelProps) {
  return (
    <div className="card space-y-5">
      <div>
        <div className="flex justify-between text-xs text-midnight-400 mb-1">
          <span>
            {pendingCount} merchant{pendingCount === 1 ? '' : 's'} · {transactionsLeft} transaction
            {transactionsLeft === 1 ? '' : 's'} left
          </span>
          <span>
            {done} of {total} done
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-midnight-800 overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white">{current.items[0].displayName || current.key}</h3>
        <p className="text-sm text-midnight-400">
          {current.items.length} transaction{current.items.length === 1 ? '' : 's'} ·{' '}
          {formatCurrency(current.total, currency)} total
        </p>
        <ul className="mt-3 text-sm text-midnight-300 space-y-1">
          {current.items.slice(0, 3).map(t => (
            <li key={t.id} className="truncate">
              {t.description}
            </li>
          ))}
          {current.items.length > 3 && <li className="text-midnight-500">+ {current.items.length - 3} more</li>}
        </ul>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {quickPicks.map((category, i) => (
          <button
            key={category}
            onClick={() => onAssign(category)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-midnight-800 hover:bg-midnight-700 text-left transition-colors"
          >
            <kbd className="text-xs text-midnight-400 border border-midnight-600 rounded px-1.5">{i + 1}</kbd>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
            <span className="text-sm truncate">{category}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onSkip} className="btn-secondary text-sm flex items-center gap-2">
          <SkipForward className="w-4 h-4" /> Skip <kbd className="text-xs text-midnight-400">S</kbd>
        </button>
        <button onClick={onExclude} className="btn-secondary text-sm flex items-center gap-2">
          <EyeOff className="w-4 h-4" /> Exclude <kbd className="text-xs text-midnight-400">E</kbd>
        </button>
      </div>

      {upNext.length > 0 && (
        <div className="pt-4 border-t border-midnight-800">
          <p className="text-xs text-midnight-400 mb-2">Up next, biggest first. Pick one to jump ahead.</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {upNext.map(g => (
              <li key={g.key}>
                <button
                  onClick={() => onFocusKey(g.key)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-midnight-800/50 hover:bg-midnight-800 text-left text-sm"
                >
                  <span className="truncate text-midnight-100">{g.items[0].displayName || g.key}</span>
                  <span className="shrink-0 text-xs text-midnight-400 tabular-nums">
                    {g.items.length} · {formatCurrency(g.total, currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
