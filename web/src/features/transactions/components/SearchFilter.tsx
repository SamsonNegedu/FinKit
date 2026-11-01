import { Search, X, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getAvailableCategories } from '@/shared/utils/categorizer'

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategories: string[]
  onCategoryChange: (categories: string[]) => void
  showTransfers: boolean
  onShowTransfersChange: (show: boolean) => void
}

export default function SearchFilter({
  searchQuery,
  onSearchChange,
  selectedCategories,
  onCategoryChange,
  showTransfers,
  onShowTransfersChange,
}: SearchFilterProps) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category))
    } else {
      onCategoryChange([...selectedCategories, category])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div ref={categoryRef} className="relative flex-1 sm:flex-none">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="input flex items-center justify-between gap-2 w-full"
          >
            <span className="text-sm">
              {selectedCategories.length === 0 ? 'All Categories' : `${selectedCategories.length} selected`}
            </span>
            <ChevronDown className="w-4 h-4 text-midnight-400" />
          </button>

          {showCategoryDropdown && (
            <div className="absolute top-full mt-2 right-0 bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
              <button
                onClick={() => onCategoryChange([])}
                className="w-full px-4 py-2 text-left text-sm hover:bg-midnight-700 border-b border-midnight-700"
              >
                Clear All
              </button>
              {getAvailableCategories()
                .filter(c => c !== 'Transfer')
                .map(category => (
                  <label
                    key={category}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-midnight-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
            </div>
          )}
        </div>

        {/* Show Transfers Toggle */}
        <label className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-midnight-800 border border-midnight-600 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showTransfers}
            onChange={e => onShowTransfersChange(e.target.checked)}
            className="rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
          />
          <span className="text-sm text-midnight-300">Show transfers</span>
        </label>
      </div>
    </div>
  )
}
