import { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { getCategoryColor } from '@/shared/utils/categorizer'
import CategoryIcon from '@/shared/components/CategoryIcon'

/**
 * A searchable list of categories you pick one from, with arrow keys and Enter. It owns its search and highlight,
 * so whoever shows it (the row picker in a table, the bulk bar) only says what to pick and what to do with it.
 */
export default function CategoryList({
  categories,
  current,
  onPick,
  colorOf = getCategoryColor,
  onDetails,
}: {
  categories: string[]
  /** Marked with a tick */
  current?: string
  onPick: (category: string) => void
  colorOf?: (category: string) => string
  /** Opens the subcategories of a category; a button on each row, also for a category that has none yet */
  onDetails?: (category: string) => void
}) {
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const shown = categories.filter(c => c.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <input
        type="text"
        placeholder="Search categories..."
        aria-label="Search categories"
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex(i => Math.min(i + 1, shown.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex(i => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && shown[activeIndex]) {
            e.preventDefault()
            onPick(shown[activeIndex])
          }
        }}
        className="w-full px-3 py-2 bg-midnight-700 border-b border-line-strong text-sm focus:outline-none"
        autoFocus
      />
      <div className="max-h-[240px] overflow-y-auto" role="listbox" aria-label="Categories">
        {shown.map((category, i) => (
          <div
            key={category}
            className={`group flex items-center hover:bg-midnight-700 ${i === activeIndex ? 'bg-midnight-700' : ''}`}
          >
            <button
              role="option"
              aria-selected={category === current}
              ref={el => {
                if (el && i === activeIndex) {
                  el.scrollIntoView({ block: 'nearest' })
                }
              }}
              onClick={() => onPick(category)}
              className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
            >
              <CategoryIcon category={category} color={colorOf(category)} size="sm" />
              <span className="text-sm flex-1">{category}</span>
              {category === current && <Check className="w-4 h-4 text-accent" />}
            </button>
            {onDetails && (
              <button
                onClick={() => onDetails(category)}
                aria-label={`Subcategories of ${category}`}
                className="mr-1 rounded p-1.5 text-midnight-500 hover:bg-midnight-600 hover:text-ink focus:text-ink"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
