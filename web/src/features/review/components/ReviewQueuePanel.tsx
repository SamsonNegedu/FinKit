import CategoryIcon from '@/shared/components/CategoryIcon'
import { useState } from 'react'
import { SkipForward, EyeOff, Search } from 'lucide-react'
import { formatCurrency } from '@/shared/utils/format'
import { getExpenseCategories } from '@/shared/utils/categorizer'
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

function reviewCategoryOptions(
  query: string,
  showAll: boolean,
  quickPicks: string[],
  rest: string[],
  selectable: string[],
): string[] {
  if (query) {
    return selectable.filter(c => c.toLowerCase().includes(query))
  }
  if (showAll) {
    return [...quickPicks, ...rest]
  }

  return quickPicks
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
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const query = search.trim().toLowerCase()
  const selectable = getExpenseCategories().filter(c => c !== 'Transfer' && c !== 'Other')
  const rest = selectable.filter(c => !quickPicks.includes(c))
  // Frequent picks first (numbered for the 1-9 keys); the rest follow on request or when searching
  const options = reviewCategoryOptions(query, showAll, quickPicks, rest, selectable)
  const pick = (category: string) => {
    setSearch('')
    onAssign(category)
  }
  const hiddenUpNext = Math.max(0, pendingCount - 1 - upNext.length)

  return (
    <div className="card !p-4 sm:!p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-xl font-semibold text-ink">{current.items[0].displayName || current.key}</h3>
              <p className="text-xs text-midnight-400">
                {done} of {total} done · {transactionsLeft} transaction{transactionsLeft === 1 ? '' : 's'} left
              </p>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-midnight-800">
              <div className="h-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <p className="mt-3 text-sm text-midnight-400">
              {current.items.length} transaction{current.items.length === 1 ? '' : 's'} ·{' '}
              {formatCurrency(current.total, currency)} total
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-midnight-300">
              {current.items.slice(0, 3).map(t => (
                <li key={t.id} className="truncate">
                  {t.description}
                </li>
              ))}
              {current.items.length > 3 && <li className="text-midnight-500">+ {current.items.length - 3} more</li>}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-midnight-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && options[0]) {
                    pick(options[0])
                  } else if (e.key === 'Escape') {
                    setSearch('')
                    e.currentTarget.blur()
                  }
                }}
                placeholder="Search categories, or press 1-9"
                className="input w-full text-sm pl-9"
                aria-label="Search categories"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {options.map((category, i) => (
                <button
                  key={category}
                  onClick={() => pick(category)}
                  className="flex items-center gap-2 rounded-lg bg-midnight-800 px-2.5 py-1.5 text-left transition-colors hover:bg-accent/10"
                >
                  {!query && i < 9 && (
                    <kbd className="text-xs text-midnight-400 border border-line-strong rounded px-1.5">{i + 1}</kbd>
                  )}
                  <CategoryIcon category={category} size="sm" />
                  <span className="text-sm">{category}</span>
                </button>
              ))}
              {!query && rest.length > 0 && (
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="rounded-lg border border-dashed border-line-strong px-2.5 py-1.5 text-sm text-midnight-300 hover:border-midnight-400 hover:text-ink"
                >
                  {showAll ? 'Fewer' : `More (${rest.length})`}
                </button>
              )}
              {options.length === 0 && <p className="text-sm text-midnight-400">No categories match.</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onSkip}
              className="flex flex-col items-start rounded-lg border border-line-strong bg-midnight-800 px-4 py-2 text-left transition-colors hover:bg-midnight-700"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <SkipForward className="w-4 h-4" /> Skip <kbd className="text-xs text-midnight-400">S</kbd>
              </span>
              <span className="text-xs text-midnight-400">Decide later, it comes back</span>
            </button>
            <button
              onClick={onExclude}
              className="flex flex-col items-start rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-left transition-colors hover:bg-warning/20"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-warning">
                <EyeOff className="w-4 h-4" /> Exclude <kbd className="text-xs text-warning/70">E</kbd>
              </span>
              <span className="text-xs text-warning/70">Not spending, leave out of totals</span>
            </button>
          </div>
        </div>

        {upNext.length > 0 && (
          <aside className="min-w-0 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <p className="mb-2 text-xs text-midnight-400">Up next, biggest first</p>
            <ul className="max-h-72 space-y-0.5 overflow-y-auto lg:max-h-[calc(100dvh-14rem)]">
              {upNext.map(g => (
                <li key={g.key}>
                  <button
                    onClick={() => onFocusKey(g.key)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                  >
                    <span className="truncate text-midnight-100">{g.items[0].displayName || g.key}</span>
                    <span className="shrink-0 text-xs tabular-nums text-midnight-400">
                      {g.items.length} · {formatCurrency(g.total, currency)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {hiddenUpNext > 0 && <p className="mt-2 text-xs text-midnight-500">+ {hiddenUpNext} more after these</p>}
          </aside>
        )}
      </div>
    </div>
  )
}
