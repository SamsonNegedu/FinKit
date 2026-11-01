import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { getCategoryColor } from '@/shared/utils/categorizer'

export interface CategoryPickerPortalProps {
  dropdownRef: React.RefObject<HTMLDivElement>
  pickerPos: { left: number; top?: number; bottom?: number }
  categorySearch: string
  onCategorySearchChange: (value: string) => void
  activeIndex: number
  onActiveIndexChange: (updater: (i: number) => number) => void
  filteredCategories: string[]
  current: string | undefined
  onPick: (category: string) => void
  onClose: () => void
}

export default function CategoryPickerPortal({
  dropdownRef,
  pickerPos,
  categorySearch,
  onCategorySearchChange,
  activeIndex,
  onActiveIndexChange,
  filteredCategories,
  current,
  onPick,
  onClose,
}: CategoryPickerPortalProps) {
  return createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', ...pickerPos, width: 220 }}
      className="bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl z-[80] max-h-[280px] overflow-hidden"
    >
      <input
        type="text"
        placeholder="Search categories..."
        aria-label="Search categories"
        value={categorySearch}
        onChange={e => {
          onCategorySearchChange(e.target.value)
          onActiveIndexChange(() => 0)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            onActiveIndexChange(i => Math.min(i + 1, filteredCategories.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            onActiveIndexChange(i => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && filteredCategories[activeIndex]) {
            e.preventDefault()
            onPick(filteredCategories[activeIndex])
            onClose()
          }
        }}
        className="w-full px-3 py-2 bg-midnight-700 border-b border-midnight-600 text-sm focus:outline-none"
        autoFocus
      />
      <div className="max-h-[240px] overflow-y-auto" role="listbox" aria-label="Categories">
        {filteredCategories.map((category, i) => (
          <button
            key={category}
            role="option"
            aria-selected={category === current}
            ref={el => {
              if (el && i === activeIndex) el.scrollIntoView({ block: 'nearest' })
            }}
            onClick={() => {
              onPick(category)
              onClose()
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-midnight-700 text-left ${i === activeIndex ? 'bg-midnight-700' : ''}`}
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
            <span className="text-sm flex-1">{category}</span>
            {category === current && <Check className="w-4 h-4 text-accent" />}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  )
}
