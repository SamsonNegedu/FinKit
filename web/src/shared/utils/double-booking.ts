import { Transaction } from '@/shared/types'
import { parseLocalDate } from './dates'

/** Days a transfer can take between two of your accounts. */
const MATCH_DAYS = 3
const MS_PER_DAY = 86_400_000

const sameAmount = (a: Transaction, b: Transaction) => Math.abs(a.amount - b.amount) <= 0.01
const daysApart = (a: Transaction, b: Transaction) =>
  Math.abs(parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()) / MS_PER_DAY

const tokens = (name: string) =>
  name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
/** A name reduced to its letters and digits, so "SAMSON O. NEGE" and "Samson O Nege" read the same. */
const nameKey = (name: string) => tokens(name).join('')
const startsOneWayOrOther = (a: string, b: string) => a.startsWith(b) || b.startsWith(a)

/**
 * The same person: a middle name left out ("Samson Negedu" and "Samson Ojoagbadua Negedu") or a name cut short by the
 * bank ("NEGE") do not make them different. First and last name must agree.
 */
function sameName(a: string, b: string): boolean {
  const x = tokens(a)
  const y = tokens(b)

  if (x.length >= 2 && y.length >= 2) {
    const [xf, xl, yf, yl] = [x[0], x[x.length - 1], y[0], y[y.length - 1]]
    const firstAndLast =
      xf.length >= 3 &&
      yf.length >= 3 &&
      xl.length >= 3 &&
      yl.length >= 3 &&
      startsOneWayOrOther(xf, yf) &&
      startsOneWayOrOther(xl, yl)
    // Cut short anywhere: all of the shorter name's words open the longer one ("SAMSON OJOAGBADUA" of "Samson Ojoagbadua Negedu")
    const [short, long] = x.length <= y.length ? [x, y] : [y, x]
    const opens = short.every((w, i) => (i === short.length - 1 ? long[i].startsWith(w) : long[i] === w))

    return firstAndLast || opens
  }
  const [kx, ky] = [x.join(''), y.join('')]

  return kx.length >= 6 && ky.length >= 6 && startsOneWayOrOther(kx, ky)
}

const cents = (amount: number) => Math.round(amount * 100)

/** Credits not marked yet, by amount in cents: finding a transfer's other leg then looks at a handful, not every row. */
function creditsByAmount(all: Transaction[], marked: Set<string>) {
  const byCents = new Map<number, Transaction[]>()

  for (const c of all) {
    if (c.type === 'income' && !marked.has(c.id)) {
      const key = cents(c.amount)

      byCents.set(key, [...(byCents.get(key) ?? []), c])
    }
  }

  return byCents
}

/** The credit on another account of yours that matches this internal debit, when one is not marked yet. */
function counterLeg(
  debit: Transaction,
  byCents: Map<number, Transaction[]>,
  marked: Set<string>,
): Transaction | undefined {
  const near = [-1, 0, 1].flatMap(d => byCents.get(cents(debit.amount) + d) ?? [])

  return near
    .filter(
      c =>
        !marked.has(c.id) &&
        sameAmount(c, debit) &&
        daysApart(c, debit) <= MATCH_DAYS &&
        // another account of yours, not the one the money left
        !!c.accountRef &&
        !!debit.accountRef &&
        c.accountRef !== debit.accountRef,
    )
    .sort((x, y) => daysApart(x, debit) - daysApart(y, debit))[0]
}

interface DoubleBookingPair {
  outgoing: Transaction
  incoming: Transaction
  amount: number
  date: string
}

// Detect internal transfers between user's own accounts
// This prevents inflated income/expense totals when money moves between accounts
export function detectDoubleBookings(transactions: Transaction[]): Transaction[] {
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

  // Step 2b: a transfer has two legs, and only one may name an account of yours (the other can arrive from an IBAN or a
  // name written differently). An unmarked credit that matches an internal debit from another account is its other leg.
  const unmarkedCredits = creditsByAmount(transactions, markedAsInternal)

  for (const expense of transactions.filter(tx => tx.type === 'expense' && markedAsInternal.has(tx.id))) {
    const leg = counterLeg(expense, unmarkedCredits, markedAsInternal)

    if (leg) {
      markedAsInternal.add(leg.id)
    }
  }

  // Step 2c: whoever sent or received those legs is you, so the same name elsewhere is you too (an account at a bank
  // that is not connected, written as the bank wrote it: capitals, cut short)
  const ownNames = new Set<string>()

  for (const tx of transactions) {
    if (markedAsInternal.has(tx.id) && !tx.isTransfer && nameKey(tx.recipient || '').length >= 6) {
      ownNames.add(tx.recipient || '')
    }
  }
  for (const tx of transactions) {
    if (!markedAsInternal.has(tx.id) && !!tx.recipient && [...ownNames].some(n => sameName(n, tx.recipient || ''))) {
      markedAsInternal.add(tx.id)
    }
  }

  // Step 3: Pair each internal debit with the internal credit of the same amount closest in time (up to three days apart:
  // banks settle at different speeds)
  const pairs: DoubleBookingPair[] = []
  const pairedIds = new Set<string>()
  const credits = transactions.filter(tx => tx.type === 'income' && markedAsInternal.has(tx.id))

  for (const expense of transactions.filter(tx => tx.type === 'expense' && markedAsInternal.has(tx.id))) {
    const income = credits
      .filter(c => !pairedIds.has(c.id) && sameAmount(c, expense) && daysApart(c, expense) <= MATCH_DAYS)
      .sort((x, y) => daysApart(x, expense) - daysApart(y, expense))[0]

    if (income) {
      pairs.push({ outgoing: expense, incoming: income, amount: expense.amount, date: expense.date })
      pairedIds.add(expense.id)
      pairedIds.add(income.id)
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
          ? isIncomingSide
            ? pairs.find(p => p.incoming.id === tx.id)?.outgoing.id
            : pairs.find(p => p.outgoing.id === tx.id)?.incoming.id
          : undefined,
      }
    }

    return tx
  })

  return result
}

// Check if a transaction is an internal transfer between user's own accounts
function isInternalTransfer(tx: Transaction, userAccounts: Set<string>, userAccountNames: Set<string>): boolean {
  // Check if already flagged as transfer in source data
  if (tx.isTransfer) {
    return true
  }

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
