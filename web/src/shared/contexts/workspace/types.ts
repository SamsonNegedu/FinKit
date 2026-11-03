import type { CategoryList } from '@/shared/utils/categorizer/categoryList'
import type { ReactNode } from 'react'
import type { ImportOptions } from '@/features/import/components/FileUpload'
import type { ToastItem } from '@/shared/components/feedback/Toast'
import type { NumberFormat } from '@/shared/utils/format'
import type { RateMap } from '@/shared/utils/rates'
import type { RuleMatch } from '@/shared/utils/categorizer'
import type { SplitPart } from '@/shared/utils/splits'
import type { DateRange, RawTransaction, SheetConfig, Transaction } from '@/shared/types'
import type { TripLinks } from './useTripLinks'
import type { WorkspacePhase, SheetBootstrapPhase } from './workspacePhase'

export interface MappingChange {
  merchant: string
  category: string
}

export interface AppState {
  transactions: Transaction[]
  displayTransactions: Transaction[]
  tripLinks: TripLinks
  setTripLinks: (links: TripLinks) => void
  baseCurrency: string
  foreignCurrencies: string[]
  rates: RateMap
  onRatesChange: (rates: RateMap) => void
  dateRange: DateRange | null
  setDateRange: (range: DateRange | null) => void
  sheetConfig: SheetConfig | null
  /** The categories in use: those to pick from, and those archived (still shown in filters and history) */
  categoryList: CategoryList
  setSheetConfig: (config: SheetConfig | null) => void
  isLoading: boolean
  isRestoring: boolean
  error: string | null
  workspacePhase: WorkspacePhase
  sheetBootstrapPhase: SheetBootstrapPhase
  anonymizationEnabled: boolean
  toggleAnonymization: () => void
  uploadFile: (file: File, options: ImportOptions) => Promise<void>
  addFile: (file: File) => Promise<void>
  importBankTransactions: (incoming: RawTransaction[], bankName: string, quiet?: boolean) => void
  clearData: () => void
  downloadCsv: () => void
  /** `onlyThis` keeps a category change to that one transaction: no rule is learned, no sibling changes */
  updateTransaction: (id: string, updates: Partial<Transaction>, onlyThis?: boolean) => void
  bulkUpdate: (ids: string[], updates: Partial<Transaction>) => void
  /** A rule made from a transaction: rows that fit all its conditions get the category, now and on later syncs */
  makeRule: (match: RuleMatch, category: string) => Promise<void>
  split: (id: string, parts: SplitPart[]) => void
  unsplit: (parentId: string) => void
  renameMerchant: (merchantKey: string, name: string) => void
  remember: boolean
  toggleRemember: () => void
  numberFormat: NumberFormat
  toggleNumberFormat: () => void
  pendingSaves: number
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
}

export type AppStateProviderProps = { children: ReactNode }

export const withEdit = (t: Transaction, updates: Partial<Transaction>): Transaction => ({
  ...t,
  ...updates,
  ...('isExcluded' in updates ? { excludedManually: true } : {}),
})
