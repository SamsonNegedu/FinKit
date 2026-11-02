import { useState } from 'react'
import { Check } from 'lucide-react'
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
}: {
  categories: string[]
  /** Marked with a tick */
  current?: string
  onPick: (category: string) => void
  colorOf?: (category: string) => string
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
        className="w-full px-3 py-2 bg-midnight-700 border-b border-midnight-600 text-sm focus:outline-none"
        autoFocus
      />
      <div className="max-h-[240px] overflow-y-auto" role="listbox" aria-label="Categories">
        {shown.map((category, i) => (
          <button
            key={category}
            role="option"
            aria-selected={category === current}
            ref={el => {
              if (el && i === activeIndex) {
                el.scrollIntoView({ block: 'nearest' })
              }
            }}
            onClick={() => onPick(category)}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-midnight-700 text-left ${i === activeIndex ? 'bg-midnight-700' : ''}`}
          >
            <CategoryIcon category={category} color={colorOf(category)} size="sm" />
            <span className="text-sm flex-1">{category}</span>
            {category === current && <Check className="w-4 h-4 text-accent" />}
          </button>
        ))}
      </div>
    </>
  )
}
