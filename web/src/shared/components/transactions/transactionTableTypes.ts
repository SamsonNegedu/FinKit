import type { ReactNode } from 'react'
import { Transaction } from '@/shared/types'
import type { RuleMatch } from '@/shared/utils/categorizer'
import { SplitPart } from '@/shared/utils/splits'
import { formatDay } from '@/shared/utils/dates'

/** What differs when the same table shows something other than the monthly transactions (a trip's). */
export interface TableBehaviour {
  /** The categories that can be picked; the monthly ones by default */
  categories?: string[]
  /** The color of a category; the monthly one by default */
  colorOf?: (category: string) => string
  /** Finer choices inside a category, offered right after picking it */
  detailsOf?: (category: string) => string[]
  /** Categories that can take a subcategory; all of them when not given */
  canAddDetail?: (category: string) => boolean
  /** A category and one of its details picked together; an empty detail means none */
  onPickDetail?: (id: string, category: string, detail: string) => void
  /** A subcategory typed in the picker for a category; the caller remembers it */
  onAddDetail?: (category: string, name: string) => void
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
  onUpdateTransaction: (id: string, updates: Partial<Transaction>, onlyThis?: boolean) => void
  onBulkCategoryChange: (category: string, detail?: string) => void
  onSetCategoryForIds: (ids: string[], category: string, detail?: string) => void
  onMakeRule?: (match: RuleMatch, category: string, detail?: string) => void
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

/** The year is shown only when the list spans more than one, or "12 May" could be any of them */
export function formatTransactionDate(date: string, withYear = false): string {
  return formatDay(date, withYear)
}
