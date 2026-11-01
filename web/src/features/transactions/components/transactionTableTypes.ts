import { Transaction } from '@/shared/types'
import { SplitPart } from '@/shared/utils/splits'
import { formatDay } from '@/shared/utils/dates'

export interface TransactionTableProps {
  transactions: Transaction[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onSelectAll: () => void
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  onBulkCategoryChange: (category: string) => void
  onSetCategoryForIds: (ids: string[], category: string) => void
  onBulkExclude: () => void
  onBulkInclude: () => void
  onSplit: (id: string, parts: SplitPart[]) => void
  onUnsplit: (parentId: string) => void
  onRenameMerchant: (merchantKey: string, name: string) => void
  currency: string
  viewMode?: 'list' | 'merchant'
  onViewModeChange?: (mode: 'list' | 'merchant') => void
  hideViewToggle?: boolean
}

export type SortField = 'date' | 'amount' | 'category' | 'description'
export type SortDirection = 'asc' | 'desc'

export type MerchantGroup = {
  key: string
  items: Transaction[]
  total: number
  categories: Set<string>
}

export function formatTransactionDate(date: string): string {
  return formatDay(date)
}
