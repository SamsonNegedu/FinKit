import type { Transaction } from '@/shared/types'
import { getAvailableCategories, merchantKeyOf, normalizeMerchant } from '@/shared/utils/categorizer'
import type { Contract, Frequency } from '../api/contracts.api'

export interface UploadCandidate {
  key: string
  name: string
  amount: number
  currency: string
  frequency: Frequency
  lastDate: string
  category: string
  count: number
}

const MIN_PAYMENTS: Record<Frequency, number> = { monthly: 3, quarterly: 3, yearly: 2 }

/**
 * Recurring payments in files you uploaded that the server does not know about yet. Uploaded
 * transactions never leave the browser, so only what you choose to add (a name, an amount and how
 * often) is sent, never the transactions themselves.
 */
export function uploadCandidates(transactions: Transaction[], contracts: Contract[]): UploadCandidate[] {
  const known = new Set(contracts.map(c => normalizeMerchant(c.payee ?? c.name)))
  const categories = new Set(getAvailableCategories())
  const groups = new Map<string, Transaction[]>()

  for (const t of transactions) {
    // Synced rows carry their bank: the server already looks at those
    if (t.bankName || !t.isRecurring || t.type === 'income' || t.category === 'Transfer') {
      continue
    }
    const key = normalizeMerchant(merchantKeyOf(t))

    if (key.length >= 2 && !known.has(key)) {
      groups.set(key, [...(groups.get(key) ?? []), t])
    }
  }
  const out: UploadCandidate[] = []

  for (const [key, rows] of groups) {
    const frequency = rows[0].recurringFrequency

    if (frequency !== 'monthly' && frequency !== 'quarterly' && frequency !== 'yearly') {
      continue
    }
    if (rows.length < MIN_PAYMENTS[frequency]) {
      continue
    }
    const latest = rows.reduce((a, b) => (b.date > a.date ? b : a))

    out.push({
      key,
      name: latest.displayName ?? merchantKeyOf(latest),
      amount: Math.abs(latest.amount),
      currency: latest.currency || 'EUR',
      frequency,
      lastDate: latest.date,
      category: latest.category && categories.has(latest.category) ? latest.category : 'Other',
      count: rows.length,
    })
  }

  return out.sort((a, b) => b.amount - a.amount)
}
