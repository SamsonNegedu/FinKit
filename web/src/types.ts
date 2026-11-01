// Core transaction types
export interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  subcategory?: string;
  recipient?: string;
  recipientIban?: string;
  referenceAccount?: string;
  referenceAccountName?: string;
  isTransfer?: boolean;
  rawData: Record<string, string>;
}

export interface Transaction extends RawTransaction {
  id: string;
  type: 'income' | 'expense';
  merchant?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  isExcluded?: boolean;
  categorySource?: 'rule' | 'ai' | 'manual' | 'learned';
  doubleBookingMatch?: string; // ID of the matching transaction in a double-booking pair
  displayName?: string;        // user-chosen merchant name (grouping and learning still use the original)
  splitOf?: string;            // id of the transaction this one was split from
  originalAmount?: number;     // amount before currency conversion
  originalCurrency?: string;   // currency before conversion
}

// Anonymization types
export interface AnonymizationMapping {
  original: string;
  anonymized: string;
  type: 'name' | 'iban' | 'account' | 'email' | 'phone' | 'address';
}

export interface AnonymizedData {
  transactions: Transaction[];
  mappings: AnonymizationMapping[];
}

// Category mapping for export
export interface CategoryMapping {
  appCategory: string;
  sheetColumn: string;
}

// One column of the Google Sheet, in sheet order
export type SheetColumnKind =
  | 'month' | 'category' | 'total' | 'income' | 'incomeAfter' | 'savings' | 'investment' | 'net' | 'other';

export interface SheetColumn {
  column: string; // letter, e.g. "P"
  name: string;   // header text exactly as in the sheet
  kind: SheetColumnKind;
}

// Sheet configuration
export interface SheetConfig {
  sheetId: string;
  tabName: string;
  monthFormat: 'short' | 'long' | 'numeric'; // Jan, January, 01
  monthColumn: string; // Column letter for month, e.g., "A"
  categoryMappings: CategoryMapping[];
  constantColumns: string[]; // Formula columns to skip (auto-calculated)
  // Specific columns for income/savings data
  incomeColumn?: string;    // Default: T
  savingsColumn?: string;   // Default: V
  investmentColumn?: string; // Default: W
  // Mirrors the sheet's header row. Synced from the sheet; falls back to a built-in default.
  layout?: SheetColumn[];
  headerRow?: number;
  layoutSyncedAt?: number;
}

// Analytics types
export interface CategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
  color: string;
}

export interface AnalysisSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  avgDailySpend: number;
  categorySummary: CategorySummary[];
  topMerchants: { merchant: string; total: number; count: number }[];
  currency: string;
}

// Date range
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

