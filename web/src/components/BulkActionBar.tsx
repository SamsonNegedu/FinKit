import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, Tag, EyeOff, Eye } from 'lucide-react'
import { AVAILABLE_CATEGORIES, CATEGORY_COLORS } from '../lib/categorizer'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onCategoryChange: (category: string) => void
  onExclude: () => void
  onInclude: () => void
}

export default function BulkActionBar({
  selectedCount,
  onClearSelection,
  onCategoryChange,
  onExclude,
  onInclude,
}: BulkActionBarProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-midnight-800 border border-midnight-600 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
        <span className="text-sm text-midnight-300">
          <span className="font-medium text-white">{selectedCount}</span> selected
        </span>

        <div className="w-px h-6 bg-midnight-600" />

        {/* Set Category */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-midnight-700 hover:bg-midnight-600 rounded-lg transition-colors"
          >
            <Tag className="w-4 h-4 text-midnight-400" />
            <span className="text-sm">Set Category</span>
            <ChevronDown className="w-4 h-4 text-midnight-400" />
          </button>

          {showDropdown && (
            <div className="absolute bottom-full left-0 mb-2 bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl min-w-[200px] max-h-[300px] overflow-y-auto">
              {AVAILABLE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    onCategoryChange(category)
                    setShowDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-midnight-700 text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  <span className="text-sm">{category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exclude Button */}
        <button
          onClick={onExclude}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors"
          title="Exclude from totals"
        >
          <EyeOff className="w-4 h-4" />
          <span className="text-sm">Exclude</span>
        </button>

        {/* Include Button */}
        <button
          onClick={onInclude}
          className="flex items-center gap-2 px-3 py-1.5 bg-income/20 hover:bg-income/30 text-income rounded-lg transition-colors"
          title="Include in totals"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm">Include</span>
        </button>

        <div className="w-px h-6 bg-midnight-600" />

        <button
          onClick={onClearSelection}
          className="p-1.5 hover:bg-midnight-700 rounded-lg transition-colors"
          title="Clear selection"
        >
          <X className="w-4 h-4 text-midnight-400" />
        </button>
      </div>
    </div>
  )
}
