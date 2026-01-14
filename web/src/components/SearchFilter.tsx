import { Search, X, Calendar, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { DateRange, Transaction } from '../types'
import { AVAILABLE_CATEGORIES } from '../lib/categorizer'

interface SearchFilterProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    selectedCategories: string[]
    onCategoryChange: (categories: string[]) => void
    showTransfers: boolean
    onShowTransfersChange: (show: boolean) => void
    dateRange: DateRange | null
    onDateRangeChange: (range: DateRange | null) => void
    transactionCount: number
    totalCount: number
    transactions?: Transaction[] // For detecting available months
}

export default function SearchFilter({
    searchQuery,
    onSearchChange,
    selectedCategories,
    onCategoryChange,
    showTransfers,
    onShowTransfersChange,
    dateRange,
    onDateRangeChange,
    transactionCount,
    totalCount,
    transactions = [],
}: SearchFilterProps) {
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [showDatePicker, setShowDatePicker] = useState(false)
    const categoryRef = useRef<HTMLDivElement>(null)
    const dateRef = useRef<HTMLDivElement>(null)

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setShowCategoryDropdown(false)
            }
            if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
                setShowDatePicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Detect available months from transaction data
    const availableMonths = useMemo(() => {
        if (transactions.length === 0) return []
        
        const monthSet = new Map<string, { start: Date; end: Date; label: string }>()
        
        for (const tx of transactions) {
            const date = new Date(tx.date)
            const year = date.getFullYear()
            const month = date.getMonth()
            const key = `${year}-${month}`
            
            if (!monthSet.has(key)) {
                monthSet.set(key, {
                    start: new Date(year, month, 1),
                    end: new Date(year, month + 1, 0), // Last day of month
                    label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                })
            }
        }
        
        // Sort by date descending (most recent first)
        return Array.from(monthSet.values()).sort((a, b) => b.start.getTime() - a.start.getTime())
    }, [transactions])

    const handleCategoryToggle = (category: string) => {
        if (selectedCategories.includes(category)) {
            onCategoryChange(selectedCategories.filter(c => c !== category))
        } else {
            onCategoryChange([...selectedCategories, category])
        }
    }

    const formatDateRange = () => {
        if (!dateRange) return 'All Time'
        
        // Check if it's a full month
        const start = dateRange.startDate
        const end = dateRange.endDate
        const isFullMonth = start.getDate() === 1 && 
            end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
            start.getMonth() === end.getMonth() &&
            start.getFullYear() === end.getFullYear()
        
        if (isFullMonth) {
            return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
        
        const format = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
        return `${format(start)} - ${format(end)}`
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
                        onChange={(e) => onSearchChange(e.target.value)}
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

                {/* Date Range Picker */}
                <div ref={dateRef} className="relative">
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="input flex items-center gap-2 min-w-[180px]"
                    >
                        <Calendar className="w-4 h-4 text-midnight-400" />
                        <span className="text-sm">{formatDateRange()}</span>
                        <ChevronDown className="w-4 h-4 text-midnight-400 ml-auto" />
                    </button>

                    {showDatePicker && (
                        <div className="absolute top-full mt-2 right-0 bg-midnight-800 border border-midnight-600 rounded-lg shadow-xl z-50 min-w-[220px] max-h-[400px] overflow-y-auto">
                            {/* All Time option */}
                            <button
                                onClick={() => {
                                    onDateRangeChange(null)
                                    setShowDatePicker(false)
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-midnight-700 border-b border-midnight-700 ${!dateRange ? 'bg-accent/20 text-accent' : ''}`}
                            >
                                All Time
                            </button>
                            
                            {/* Available months from data */}
                            {availableMonths.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-xs text-midnight-500 uppercase tracking-wide bg-midnight-850">
                                        From Your Data
                                    </div>
                                    {availableMonths.map((month) => {
                                        const isSelected = dateRange && 
                                            dateRange.startDate.getTime() === month.start.getTime() &&
                                            dateRange.endDate.getTime() === month.end.getTime()
                                        return (
                                            <button
                                                key={month.label}
                                                onClick={() => {
                                                    onDateRangeChange({ startDate: month.start, endDate: month.end })
                                                    setShowDatePicker(false)
                                                }}
                                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-midnight-700 ${isSelected ? 'bg-accent/20 text-accent' : ''}`}
                                            >
                                                {month.label}
                                            </button>
                                        )
                                    })}
                                </>
                            )}
                            
                            {/* Quick presets */}
                            <div className="px-4 py-2 text-xs text-midnight-500 uppercase tracking-wide bg-midnight-850 border-t border-midnight-700">
                                Quick Select
                            </div>
                            <button
                                onClick={() => {
                                    const now = new Date()
                                    onDateRangeChange({
                                        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
                                        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
                                    })
                                    setShowDatePicker(false)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-midnight-700"
                            >
                                This Month
                            </button>
                            <button
                                onClick={() => {
                                    const now = new Date()
                                    onDateRangeChange({
                                        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                                        endDate: new Date(now.getFullYear(), now.getMonth(), 0)
                                    })
                                    setShowDatePicker(false)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-midnight-700"
                            >
                                Last Month
                            </button>
                            <button
                                onClick={() => {
                                    const now = new Date()
                                    onDateRangeChange({
                                        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
                                        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
                                    })
                                    setShowDatePicker(false)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-midnight-700"
                            >
                                Last 3 Months
                            </button>
                                <button
                                    onClick={() => {
                                    const now = new Date()
                                    onDateRangeChange({
                                        startDate: new Date(now.getFullYear(), 0, 1),
                                        endDate: new Date(now.getFullYear(), 11, 31)
                                    })
                                        setShowDatePicker(false)
                                    }}
                                className="w-full px-4 py-2.5 text-left text-sm hover:bg-midnight-700"
                                >
                                This Year
                                </button>
                        </div>
                    )}
                </div>

                {/* Category Filter */}
                <div ref={categoryRef} className="relative">
                    <button
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="input flex items-center gap-2"
                    >
                        <span className="text-sm">
                            {selectedCategories.length === 0
                                ? 'All Categories'
                                : `${selectedCategories.length} selected`
                            }
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
                            {AVAILABLE_CATEGORIES.filter(c => c !== 'Transfer').map((category) => (
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
                <label className="flex items-center gap-2 px-4 py-2 bg-midnight-800 border border-midnight-600 rounded-lg cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showTransfers}
                        onChange={(e) => onShowTransfersChange(e.target.checked)}
                        className="rounded border-midnight-500 bg-midnight-700 text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-midnight-300">Show Transfers</span>
                </label>
            </div>

            {/* Transaction Count */}
            <div className="text-sm text-midnight-400">
                Showing <span className="text-white font-medium">{transactionCount}</span> of{' '}
                <span className="text-white font-medium">{totalCount}</span> transactions
            </div>
        </div>
    )
}
