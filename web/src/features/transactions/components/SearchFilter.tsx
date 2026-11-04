import { Search, X, ChevronDown } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useState, type ReactNode } from 'react'
import { getArchivedCategories, getFilterCategories } from '@/shared/utils/categorizer'
import Checkbox from '@/shared/components/forms/Checkbox'
import CategoryIcon from '@/shared/components/CategoryIcon'

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategories: string[]
  /** Categories found on the transactions being filtered, so one that is no longer in any list stays reachable */
  inData?: string[]
  onCategoryChange: (categories: string[]) => void
  /** More controls for the same row (the other filters, the view toggle) */
  extra?: ReactNode
}

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  selectedCategories,
  inData,
  onCategoryChange,
  extra,
}: SearchFilterProps) {
  const [categoryQuery, setCategoryQuery] = useState('')
  const archived = new Set(getArchivedCategories())
  const categories = getFilterCategories(inData)
    .filter(c => c !== 'Transfer' && c.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category))
    } else {
      onCategoryChange([...selectedCategories, category])
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Search Input */}
      {/* On a phone: search and Filters share the first row, the category and the view switch the second */}
      <div className="relative min-w-[220px] flex-1 max-sm:order-1 max-sm:min-w-0 max-sm:basis-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-400" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="input w-full pl-10 pr-8"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight-400 hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="hidden basis-full max-sm:order-3 max-sm:block" aria-hidden="true" />

      {/* Category filter: a Radix popover, so Escape, outside clicks and focus are handled for us */}
      <Popover.Root onOpenChange={open => !open && setCategoryQuery('')}>
        <Popover.Trigger asChild>
          <button
            className="input flex items-center justify-between gap-2 max-sm:order-4 max-sm:min-w-0 max-sm:flex-1 sm:w-48"
            aria-label="Categories"
          >
            {/* A fixed width: "All Categories" and "2 selected" differ in length, and the search box beside it would shift */}
            <span className="truncate text-sm">
              {selectedCategories.length === 0 ? 'All Categories' : `${selectedCategories.length} selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-midnight-400" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            className="z-[80] max-h-[min(20rem,var(--radix-popover-content-available-height))] min-w-[14rem] overflow-y-auto rounded-xl border border-line-strong bg-midnight-800 py-1 shadow-2xl"
          >
            <div className="sticky top-0 z-10 border-b border-line-strong bg-midnight-800">
              <input
                type="text"
                autoFocus
                placeholder="Search categories..."
                aria-label="Search categories"
                value={categoryQuery}
                onChange={e => setCategoryQuery(e.target.value)}
                className="w-full bg-transparent px-4 py-2 text-sm focus:outline-none"
              />
              <button
                onClick={() => onCategoryChange([])}
                disabled={selectedCategories.length === 0}
                className="w-full border-t border-line-strong px-4 py-2 text-left text-sm text-midnight-300 hover:bg-midnight-700 disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
            {categories.length === 0 && <p className="px-4 py-3 text-sm text-midnight-400">No category matches.</p>}
            {categories.map(category => (
              <label key={category} className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-midnight-700">
                <Checkbox
                  checked={selectedCategories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                />
                <CategoryIcon category={category} size="sm" />
                <span className="text-sm">{category}</span>
                {archived.has(category) && <span className="ml-auto text-xs text-midnight-500">archived</span>}
              </label>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {extra}
    </div>
  )
}
