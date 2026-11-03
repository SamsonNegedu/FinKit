import Tooltip from '@/shared/components/Tooltip'
import { useState, type ReactNode } from 'react'
import CategoryPopover from './CategoryPopover'
import { X, ChevronDown, Tag, EyeOff, Eye, Plane } from 'lucide-react'
import { getAvailableCategories, getCategoryColor } from '@/shared/utils/categorizer'
import { formatCurrency } from '@/shared/utils/format'
import type { SelectionTotal } from '@/shared/utils/selectionTotal'

interface BulkActionBarProps {
  selectedCount: number
  /** What the selection adds up to, shown beside the count */
  totals?: SelectionTotal[]
  onClearSelection: () => void
  onCategoryChange: (category: string, detail?: string) => void
  onExclude?: () => void
  onInclude?: () => void
  onMoveToTrip?: () => void
  /** Offer the Shift-click tip: only where a range can be selected, and only once there is a first row to start from */
  rangeHint?: boolean
  /** For touch screens: the next tap selects everything from the selected row to the tapped one */
  rangeArmed?: boolean
  onArmRange?: () => void
  categories?: string[]
  colorOf?: (category: string) => string
  /** Finer choices inside a category, offered under it as chips */
  detailsOf?: (category: string) => string[]
  /** Categories that can take a subcategory; all of them when not given */
  canAddDetail?: (category: string) => boolean
  /** Remembers a subcategory typed in the picker */
  onAddDetail?: (category: string, name: string) => void
  /** More buttons, after the usual ones */
  extra?: ReactNode
}

export default function BulkActionBar({
  selectedCount,
  totals = [],
  onClearSelection,
  onCategoryChange,
  onExclude,
  onInclude,
  onMoveToTrip,
  rangeHint = false,
  rangeArmed = false,
  onArmRange,
  categories = getAvailableCategories(),
  colorOf = getCategoryColor,
  detailsOf,
  canAddDetail,
  onAddDetail,
  extra,
}: BulkActionBarProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <div className="fixed bottom-6 max-md:bottom-20 left-1/2 -translate-x-1/2 z-50 flex w-max max-w-[calc(100vw-2rem)] flex-col items-center gap-2">
      {/* Hidden on touch screens, which have no Shift key */}
      {rangeHint && selectedCount === 1 && (
        <span className="hidden rounded-full bg-midnight-800 px-3 py-1 text-xs text-midnight-300 shadow-lg [@media(pointer:fine)]:inline">
          Tip: Shift-click another row to select everything between
        </span>
      )}
      {rangeHint && selectedCount === 1 && rangeArmed && (
        <span className="hidden rounded-full bg-accent px-3 py-1 text-xs font-medium text-midnight-950 shadow-lg [@media(pointer:coarse)]:inline">
          Tap the last row of the range
        </span>
      )}
      <div className="bg-midnight-800 border border-line-strong rounded-xl shadow-2xl px-4 py-3 flex max-w-full items-center gap-4 overflow-x-auto whitespace-nowrap">
        <span className="text-sm text-midnight-300">
          <span className="font-medium text-ink">{selectedCount}</span> selected
        </span>
        {totals.map(total => (
          <Tooltip
            key={total.currency}
            label={`In ${formatCurrency(total.incoming, total.currency)} · Out ${formatCurrency(total.outgoing, total.currency)}`}
          >
            <span
              className={`text-sm font-medium tabular-nums ${total.net > 0.005 ? 'text-income' : total.net < -0.005 ? 'text-expense' : 'text-midnight-300'}`}
            >
              {total.net > 0.005 ? '+' : ''}
              {formatCurrency(total.net, total.currency)}
            </span>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-midnight-600" />

        {rangeHint && onArmRange && selectedCount === 1 && !rangeArmed && (
          <button
            onClick={onArmRange}
            className="hidden items-center gap-2 rounded-lg bg-midnight-700 px-3 py-1.5 text-sm hover:bg-midnight-600 [@media(pointer:coarse)]:flex"
          >
            Select range
          </button>
        )}

        {/* Set Category. A popover rendered outside the bar, so the bar's own scrolling can never clip it */}
        <CategoryPopover
          open={showDropdown}
          onOpenChange={setShowDropdown}
          side="top"
          categories={categories}
          colorOf={colorOf}
          onPick={(category, _scope, detail) => onCategoryChange(category, detail)}
          detailsOf={detailsOf}
          canAddDetail={canAddDetail}
          onAddDetail={onAddDetail}
          trigger={
            <button className="flex items-center gap-2 px-3 py-1.5 bg-midnight-700 hover:bg-midnight-600 rounded-lg transition-colors">
              <Tag className="w-4 h-4 text-midnight-400" />
              <span className="text-sm">Set Category</span>
              <ChevronDown className="w-4 h-4 text-midnight-400" />
            </button>
          }
        />

        {onExclude && (
          <Tooltip label="Exclude from totals">
            <button
              onClick={onExclude}
              className="flex items-center gap-2 px-3 py-1.5 bg-warning/20 hover:bg-warning/30 text-warning rounded-lg transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              <span className="text-sm">Exclude</span>
            </button>
          </Tooltip>
        )}

        {onInclude && (
          <Tooltip label="Include in totals">
            <button
              onClick={onInclude}
              className="flex items-center gap-2 px-3 py-1.5 bg-income/20 hover:bg-income/30 text-income rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">Include</span>
            </button>
          </Tooltip>
        )}

        {onMoveToTrip && (
          <Tooltip label="Move to a trip: leaves the monthly view">
            <button
              onClick={onMoveToTrip}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors"
            >
              <Plane className="w-4 h-4" />
              <span className="text-sm">Trip</span>
            </button>
          </Tooltip>
        )}

        {extra}

        <div className="w-px h-6 bg-midnight-600" />

        <Tooltip label="Clear selection">
          <button
            aria-label="Clear selection"
            onClick={onClearSelection}
            className="p-1.5 hover:bg-midnight-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-midnight-400" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
