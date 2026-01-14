import { Transaction } from '../types'

interface RecurringPattern {
  merchant: string;
  category: string;
  avgAmount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  transactions: string[]; // Transaction IDs
}

// Tolerance for amount matching (5%)
const AMOUNT_TOLERANCE = 0.05

// Minimum occurrences to consider something recurring
const MIN_OCCURRENCES = 2

// Day tolerance for interval matching
const DAY_TOLERANCE = 3

function calculateDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)
}

function detectFrequency(intervals: number[]): 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null {
  if (intervals.length === 0) return null
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
  
  // Weekly: ~7 days
  if (avgInterval >= 5 && avgInterval <= 9) return 'weekly'
  
  // Monthly: ~30 days
  if (avgInterval >= 25 && avgInterval <= 35) return 'monthly'
  
  // Quarterly: ~90 days
  if (avgInterval >= 80 && avgInterval <= 100) return 'quarterly'
  
  // Yearly: ~365 days
  if (avgInterval >= 350 && avgInterval <= 380) return 'yearly'
  
  return null
}

function groupByMerchantAndAmount(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>()
  
  for (const tx of transactions) {
    // Skip income and transfers
    if (tx.type === 'income' || tx.category === 'Transfer') continue
    
    // Create a key based on merchant/description and approximate amount
    const merchant = tx.merchant || tx.recipient || tx.description.slice(0, 30)
    const roundedAmount = Math.round(tx.amount)
    const key = `${merchant.toLowerCase()}_${roundedAmount}`
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(tx)
  }
  
  return groups
}

function isAmountSimilar(amount1: number, amount2: number): boolean {
  const diff = Math.abs(amount1 - amount2)
  const maxAmount = Math.max(amount1, amount2)
  return diff / maxAmount <= AMOUNT_TOLERANCE
}

export function detectRecurring(transactions: Transaction[]): Transaction[] {
  // First, identify potential recurring patterns
  const patterns: RecurringPattern[] = []
  
  // Group transactions by similar merchant and amount
  const groups = groupByMerchantAndAmount(transactions)
  
  for (const [_key, txGroup] of groups) {
    if (txGroup.length < MIN_OCCURRENCES) continue
    
    // Sort by date
    const sorted = txGroup.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    // Check if amounts are similar
    const firstAmount = sorted[0].amount
    const allSimilarAmount = sorted.every(tx => isAmountSimilar(tx.amount, firstAmount))
    if (!allSimilarAmount) continue
    
    // Calculate intervals between transactions
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(calculateDaysBetween(sorted[i-1].date, sorted[i].date))
    }
    
    // Detect frequency
    const frequency = detectFrequency(intervals)
    if (!frequency) continue
    
    // Check if intervals are consistent
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const isConsistent = intervals.every(interval => 
      Math.abs(interval - avgInterval) <= DAY_TOLERANCE * 2
    )
    
    if (!isConsistent && intervals.length > 1) continue
    
    patterns.push({
      merchant: sorted[0].merchant || sorted[0].recipient || sorted[0].description.slice(0, 30),
      category: sorted[0].category || 'Other',
      avgAmount: sorted.reduce((sum, tx) => sum + tx.amount, 0) / sorted.length,
      frequency,
      transactions: sorted.map(tx => tx.id),
    })
  }
  
  // Mark transactions as recurring based on detected patterns
  const recurringIds = new Set<string>()
  const recurringFrequencies = new Map<string, 'weekly' | 'monthly' | 'quarterly' | 'yearly'>()
  
  for (const pattern of patterns) {
    for (const id of pattern.transactions) {
      recurringIds.add(id)
      recurringFrequencies.set(id, pattern.frequency)
    }
  }
  
  return transactions.map(tx => {
    if (recurringIds.has(tx.id)) {
      return {
        ...tx,
        isRecurring: true,
        recurringFrequency: recurringFrequencies.get(tx.id),
      }
    }
    return tx
  })
}

// Get summary of recurring transactions
export function getRecurringSummary(transactions: Transaction[]): {
  totalMonthlyRecurring: number;
  recurringByCategory: { category: string; amount: number }[];
} {
  const recurringTxs = transactions.filter(tx => tx.isRecurring && tx.type === 'expense')
  
  // Calculate monthly equivalent
  const monthlyEquivalent = (tx: Transaction): number => {
    switch (tx.recurringFrequency) {
      case 'weekly': return tx.amount * 4.33
      case 'monthly': return tx.amount
      case 'quarterly': return tx.amount / 3
      case 'yearly': return tx.amount / 12
      default: return tx.amount
    }
  }
  
  const byCategory = new Map<string, number>()
  let totalMonthly = 0
  
  // Group by unique recurring items (not counting duplicates)
  const seen = new Set<string>()
  
  for (const tx of recurringTxs) {
    const key = `${tx.merchant || tx.recipient || tx.description.slice(0, 30)}_${Math.round(tx.amount)}`
    if (seen.has(key)) continue
    seen.add(key)
    
    const monthly = monthlyEquivalent(tx)
    totalMonthly += monthly
    
    const category = tx.category || 'Other'
    byCategory.set(category, (byCategory.get(category) || 0) + monthly)
  }
  
  return {
    totalMonthlyRecurring: totalMonthly,
    recurringByCategory: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  }
}
