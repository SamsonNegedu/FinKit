import { useState } from 'react'
import { Check } from 'lucide-react'
import { getCategoryColor } from '@/shared/utils/categorizer'
import CategoryIcon from '@/shared/components/CategoryIcon'

/**
 * A searchable list of categories you pick one from, with arrow keys and Enter. It owns its search and highlight,
 * so whoever shows it (the row picker in a table, the bulk bar) only says what to pick and what to do with it.
 * Subcategories sit under their category as chips, so they are visible without a second click.
 */
export default function CategoryList({
  categories,
  current,
  currentDetail,
  onPick,
  colorOf = getCategoryColor,
  detailsOf,
  canAddDetail,
  onAddDetail,
}: {
  categories: string[]
  /** Marked with a tick */
  current?: string
  /** The subcategory in use, marked when its category is current */
  currentDetail?: string
  onPick: (category: string, detail?: string) => void
  colorOf?: (category: string) => string
  /** Finer choices inside a category, shown as chips under it */
  detailsOf?: (category: string) => string[]
  /** Categories that can take a subcategory; all of them when not given */
  canAddDetail?: (category: string) => boolean
  /** Opens the input for a new subcategory of this category */
  onAddDetail?: (category: string) => void
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
      <div className="max-h-[280px] overflow-y-auto" role="group" aria-label="Categories">
        {shown.map((category, i) => {
          const details = detailsOf?.(category) ?? []
          const active = i === activeIndex
          const canAdd = (canAddDetail?.(category) ?? true) && onAddDetail && (active || category === current)

          return (
            <div
              key={category}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-1.5 pb-1 hover:bg-midnight-700/60 ${active ? 'bg-midnight-700/60' : ''}`}
            >
              <button
                aria-pressed={category === current}
                ref={el => {
                  if (el && i === activeIndex) {
                    el.scrollIntoView({ block: 'nearest' })
                  }
                }}
                onClick={() => onPick(category)}
                className="flex w-full items-center gap-3 rounded-md px-1.5 pb-1 pt-2 text-left"
              >
                <CategoryIcon category={category} color={colorOf(category)} size="sm" />
                <span className="text-sm flex-1">{category}</span>
                {category === current && <Check className="w-4 h-4 text-accent" />}
              </button>
              {(details.length > 0 || canAdd) && (
                <div className="flex flex-wrap gap-1 pb-0.5 pl-8 pr-1.5">
                  {details.map(detail => (
                    <button
                      key={detail}
                      aria-pressed={category === current && detail === currentDetail}
                      onClick={() => onPick(category, detail)}
                      className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                        category === current && detail === currentDetail
                          ? 'bg-accent/20 text-accent'
                          : 'bg-midnight-700 text-midnight-200 hover:bg-midnight-600 hover:text-ink'
                      }`}
                    >
                      {detail}
                    </button>
                  ))}
                  {canAdd && (
                    <button
                      onClick={() => onAddDetail(category)}
                      className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-xs text-midnight-300 hover:border-accent hover:text-ink"
                    >
                      + New subcategory
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
