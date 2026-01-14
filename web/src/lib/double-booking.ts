import { Transaction } from '../types'

export interface DoubleBookingPair {
  outgoing: Transaction
  incoming: Transaction
  amount: number
  date: string
}

// Detect internal transfers between user's own accounts
// This prevents inflated income/expense totals when money moves between accounts
export function detectDoubleBookings(transactions: Transaction[]): {
  transactions: Transaction[]
  pairs: DoubleBookingPair[]
} {
  // Step 1: Identify all of the user's accounts from the data
  const userAccounts = new Set<string>()
  const userAccountNames = new Set<string>()
  
  for (const tx of transactions) {
    if (tx.referenceAccount) {
      userAccounts.add(tx.referenceAccount.toLowerCase())
    }
    if (tx.referenceAccountName) {
      userAccountNames.add(tx.referenceAccountName.toLowerCase())
    }
  }

  // Step 2: Mark transactions as internal if counterparty is one of user's accounts
  const markedAsInternal = new Set<string>()
  
  for (const tx of transactions) {
    if (isInternalTransfer(tx, userAccounts, userAccountNames)) {
      markedAsInternal.add(tx.id)
    }
  }

  // Step 3: Find matching pairs (same amount, same date, one in/one out)
  const pairs: DoubleBookingPair[] = []
  const pairedIds = new Set<string>()

  // Group by date for efficient matching
  const byDate = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    if (!byDate.has(tx.date)) {
      byDate.set(tx.date, [])
    }
    byDate.get(tx.date)!.push(tx)
  }

  for (const [date, dayTxs] of byDate) {
    const expenses = dayTxs.filter(tx => tx.type === 'expense' && markedAsInternal.has(tx.id))
    const incomes = dayTxs.filter(tx => tx.type === 'income' && markedAsInternal.has(tx.id))

    for (const expense of expenses) {
      if (pairedIds.has(expense.id)) continue

      for (const income of incomes) {
        if (pairedIds.has(income.id)) continue
        
        // Match by amount (within 1 cent)
        if (Math.abs(expense.amount - income.amount) > 0.01) continue

        pairs.push({
          outgoing: expense,
          incoming: income,
          amount: expense.amount,
          date,
        })
        pairedIds.add(expense.id)
        pairedIds.add(income.id)
        break
      }
    }
  }

  // Step 4: Apply markings to transactions
  const result = transactions.map(tx => {
    const isInternal = markedAsInternal.has(tx.id)
    const isPaired = pairedIds.has(tx.id)
    const isIncomingSide = pairs.some(p => p.incoming.id === tx.id)
    
    if (isInternal) {
      return {
        ...tx,
        category: 'Transfer',
        isTransfer: true,
        // Exclude internal income to prevent double-counting
        // For paired transactions, only exclude the incoming side
        // For unpaired internal transfers, exclude income
        isExcluded: tx.type === 'income',
        doubleBookingMatch: isPaired 
          ? (isIncomingSide 
              ? pairs.find(p => p.incoming.id === tx.id)?.outgoing.id
              : pairs.find(p => p.outgoing.id === tx.id)?.incoming.id)
          : undefined,
      }
    }
    return tx
  })

  return { transactions: result, pairs }
}

// Check if a transaction is an internal transfer between user's own accounts
function isInternalTransfer(
  tx: Transaction, 
  userAccounts: Set<string>,
  userAccountNames: Set<string>
): boolean {
  // Check if already flagged as transfer in source data
  if (tx.isTransfer) return true

  const description = (tx.description || '').toLowerCase()
  const recipient = (tx.recipient || '').toLowerCase()
  const recipientIban = (tx.recipientIban || '').toLowerCase()

  // Check if recipient/IBAN matches one of user's accounts
  for (const account of userAccounts) {
    if (recipientIban.includes(account) || recipient.includes(account)) {
      return true
    }
    // Check if the account number appears in description
    if (account.length > 6 && description.includes(account)) {
      return true
    }
  }

  // Check for transfer keywords in description
  const transferKeywords = [
    'sent from n26',
    'moved to',
    'moved from',
    'umbuchung',
    'übertrag',
    'internal transfer',
    'from your eur balance',
    'to your eur balance',
    'from main account',
    'to main account',
    'from euro - konto',
    'to euro - konto',
    'from travel fund',
    'to travel fund',
    'from driver',
    'to driver',
  ]

  for (const keyword of transferKeywords) {
    if (description.includes(keyword)) {
      return true
    }
  }

  // Check if recipient matches any of the user's account names
  for (const accountName of userAccountNames) {
    // Only match if it's reasonably specific (not just "Main Account")
    if (accountName.length > 3 && recipient.includes(accountName)) {
      return true
    }
  }

  // Check for patterns like "Sent [PersonName]" where PersonName appears as an account holder
  // This catches cases where the user sends to themselves across accounts
  if (description.includes('sent ') && tx.type === 'expense') {
    // If it's a send with a person-like recipient and we have income matching it
    // This will be caught by the pairing logic
    return false
  }

  return false
}

// Get summary of internal transfers
export function getDoubleBookingSummary(pairs: DoubleBookingPair[]): {
  totalAmount: number
  count: number
} {
  return {
    totalAmount: pairs.reduce((sum, p) => sum + p.amount, 0),
    count: pairs.length,
  }
}

// Get summary of all internal movements (including unpaired)
export function getInternalTransferSummary(transactions: Transaction[]): {
  excludedIncome: number
  excludedExpense: number
  internalCount: number
} {
  const internal = transactions.filter(tx => tx.isTransfer && tx.category === 'Transfer')
  
  return {
    excludedIncome: internal
      .filter(tx => tx.type === 'income' && tx.isExcluded)
      .reduce((sum, tx) => sum + tx.amount, 0),
    excludedExpense: internal
      .filter(tx => tx.type === 'expense' && tx.isExcluded)
      .reduce((sum, tx) => sum + tx.amount, 0),
    internalCount: internal.length,
  }
}
