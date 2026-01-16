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

// Export preview
export interface ExportPreviewData {
  month: string;
  columns: { name: string; value: number; isConstant: boolean }[];
  totalExpenditure: number;
  income: number;
}
