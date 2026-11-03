export interface ImportOptions {
  dateFilter: 'all' | '1m' | '3m' | '6m' | '1y' | 'custom'
  customStartDate?: Date
  customEndDate?: Date
}

export const PINNED_BANKS = ['N26', 'Wise', 'Revolut'] as const

export const DATE_FILTER_OPTIONS = [
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
] as const

const PRESET_MONTHS: Record<'1m' | '3m' | '6m' | '1y', number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1y': 12,
}

export function buildImportOptions(dateFilter: ImportOptions['dateFilter']): ImportOptions {
  const options: ImportOptions = { dateFilter }

  if (dateFilter !== 'all' && dateFilter !== 'custom') {
    const now = new Date()
    const months = PRESET_MONTHS[dateFilter]

    if (dateFilter === '1m') {
      options.customStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      options.customEndDate = new Date(lastDayPrevMonth)
      options.customEndDate.setHours(23, 59, 59, 999)
    } else {
      options.customStartDate = new Date(now.getFullYear(), now.getMonth() - months, 1)
      options.customEndDate = now
    }
  }

  return options
}
