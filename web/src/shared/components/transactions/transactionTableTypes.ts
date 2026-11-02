import type { ReactNode } from 'react'
import { Transaction } from '@/shared/types'
import { SplitPart } from '@/shared/utils/splits'
import { formatDay } from '@/shared/utils/dates'

/** What differs when the same table shows something other than the monthly transactions (a trip's). */
export interface TableBehaviour {
  /** The categories that can be picked; the monthly ones by default */
  categories?: string[]
  /** The color of a category; the monthly one by default */
  colorOf?: (category: string) => string
  /** Hide splitting a payment across categories */
  noSplit?: boolean
  /** More information under the description, such as chips */
  meta?: (tx: Transaction) => ReactNode
  /** A line under the category, such as the detail inside it */
  categoryNote?: (tx: Transaction) => ReactNode
  /** Buttons at the end of each row */
  rowActions?: (tx: Transaction) => ReactNode
  /** Extra buttons in the bar shown when rows are selected */
  bulkActions?: (ids: string[]) => ReactNode
}

export interface TransactionTableProps {
  transactions: Transaction[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onSelectAll: () => void
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void
  onBulkCategoryChange: (category: string) => void
  onSetCategoryForIds: (ids: string[], category: string) => void
  onBulkExclude?: () => void
  onBulkInclude?: () => void
  onMoveToTrip?: () => void
  onSplit?: (id: string, parts: SplitPart[]) => void
  onUnsplit?: (parentId: string) => void
  onRenameMerchant?: (merchantKey: string, name: string) => void
  currency: string
  viewMode?: 'list' | 'merchant'
  onViewModeChange?: (mode: 'list' | 'merchant') => void
  behaviour?: TableBehaviour
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
