export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  reference?: string;  // Optional reference field for transaction references
  currency: string;    // Currency code (e.g., 'EUR', 'USD')
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface CategorySummary {
  category: string;
  total: number;  // Total amount for the category
  percentage: number;
  color: string;  // Color class for the category
}

export interface AnalysisSummary {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  categorySummary: CategorySummary[];
  largestIncome: Transaction | null;
  largestExpense: Transaction | null;
}

export interface RawTransaction {
  date?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  amount?: string;
  currency?: string;
  [key: string]: string | undefined;
} 
 