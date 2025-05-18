import { Transaction, AnalysisSummary, CategorySummary, DateRange } from '../types';

// Generate color for categories
const getCategoryColor = (category: string): string => {
  // Simple hash function to generate consistent colors for categories
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

// Filter transactions by date range
export const filterByDateRange = (
  transactions: Transaction[], 
  dateRange: DateRange
): Transaction[] => {
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate >= dateRange.startDate && 
      transactionDate <= dateRange.endDate
    );
  });
};

// Cache for transfer detection results
const transferCache = new Map<string, boolean>();

// Helper function to get cache key for a transaction
const getCacheKey = (transaction: Transaction): string => {
  return `${transaction.date}_${transaction.amount}_${transaction.type}_${transaction.description}`;
};

// Helper function to group transactions by date for efficient lookup
const groupTransactionsByDate = (transactions: Transaction[]): Map<string, Transaction[]> => {
  const dateGroups = new Map<string, Transaction[]>();
  
  transactions.forEach(transaction => {
    const dateKey = new Date(transaction.date).toDateString();
    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, []);
    }
    dateGroups.get(dateKey)!.push(transaction);
  });
  
  return dateGroups;
};

// Helper function to identify transfers between accounts
export const isTransferBetweenAccounts = (transaction: Transaction, allTransactions: Transaction[]): boolean => {
  // Check cache first
  const cacheKey = getCacheKey(transaction);
  if (transferCache.has(cacheKey)) {
    return transferCache.get(cacheKey)!;
  }

  // First check description keywords
  const transferKeywords = ['transfer', 'überweisung', 'übertr', 'trf', 'trnsfr'];
  const description = transaction.description.toLowerCase();
  if (transferKeywords.some(keyword => description.includes(keyword))) {
    transferCache.set(cacheKey, true);
    return true;
  }

  // Get transactions for the same day using the grouped map
  const dateGroups = groupTransactionsByDate(allTransactions);
  const transactionDate = new Date(transaction.date);
  const sameDayTransactions = dateGroups.get(transactionDate.toDateString()) || [];

  // Look for matching amounts (positive/negative pairs)
  const matchingAmount = Math.abs(transaction.amount);
  const hasMatchingPair = sameDayTransactions.some(t => 
    t !== transaction && // Don't match with self
    Math.abs(t.amount) === matchingAmount && // Same absolute amount
    t.type !== transaction.type // Opposite type (income/expense)
  );

  // Cache the result
  transferCache.set(cacheKey, hasMatchingPair);
  return hasMatchingPair;
};

// Clear the transfer cache when new transactions are loaded
export const clearTransferCache = () => {
  transferCache.clear();
};

// Generate analysis summary
export const generateAnalysisSummary = (transactions: Transaction[], dateRange?: DateRange, includeTransfers: boolean = false): AnalysisSummary => {
  // Clear cache when generating new summary
  clearTransferCache();

  // Filter transactions by date range if provided
  const filteredTransactions = dateRange 
    ? filterByDateRange(transactions, dateRange)
    : transactions;

  // Calculate income and expenses, respecting includeTransfers flag
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income' && (includeTransfers || !isTransferBetweenAccounts(t, transactions)))
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense' && (includeTransfers || !isTransferBetweenAccounts(t, transactions)))
    .reduce((sum, t) => sum + t.amount, 0);
    
  // Find largest transactions (respecting includeTransfers flag)
  const sortedIncome = [...filteredTransactions]
    .filter(t => t.type === 'income' && (includeTransfers || !isTransferBetweenAccounts(t, transactions)))
    .sort((a, b) => b.amount - a.amount);
    
  const sortedExpenses = [...filteredTransactions]
    .filter(t => t.type === 'expense' && (includeTransfers || !isTransferBetweenAccounts(t, transactions)))
    .sort((a, b) => b.amount - a.amount);
    
  // Generate category summary (respecting includeTransfers flag)
  const categories: Record<string, number> = {};
  
  filteredTransactions
    .filter(t => t.type === 'expense' && (includeTransfers || !isTransferBetweenAccounts(t, transactions)))
    .forEach(transaction => {
      const { category, amount } = transaction;
      categories[category] = (categories[category] || 0) + amount;
    });
    
  const categorySummary: CategorySummary[] = Object.entries(categories).map(([category, total]) => ({
    category,
    total,
    percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
    color: getCategoryColor(category)
  })).sort((a, b) => b.total - a.total);
  
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    largestExpense: sortedExpenses[0] || null,
    largestIncome: sortedIncome[0] || null,
    categorySummary
  };
};

// Format currency
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};
