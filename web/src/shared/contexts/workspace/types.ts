import type { ReactNode } from 'react'
import type { ImportOptions } from '@/features/import/components/FileUpload'
import type { ToastItem } from '@/shared/components/feedback/Toast'
import type { NumberFormat } from '@/shared/utils/format'
import type { RateMap } from '@/shared/utils/rates'
import type { SplitPart } from '@/shared/utils/splits'
import type { DateRange, RawTransaction, SheetConfig, Transaction } from '@/shared/types'
import type { WorkspacePhase, SheetBootstrapPhase } from './workspacePhase'

export interface MappingChange {
  merchant: string
  category: string
}

export interface AppState {
  transactions: Transaction[]
  displayTransactions: Transaction[]
  baseCurrency: string
  foreignCurrencies: string[]
  rates: RateMap
  onRatesChange: (rates: RateMap) => void
  dateRange: DateRange | null
  setDateRange: (range: DateRange | null) => void
  sheetConfig: SheetConfig | null
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
  importBankTransactions: (incoming: RawTransaction[], bankName: string) => void
  clearData: () => void
  downloadCsv: () => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
  bulkUpdate: (ids: string[], updates: Partial<Transaction>) => void
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
