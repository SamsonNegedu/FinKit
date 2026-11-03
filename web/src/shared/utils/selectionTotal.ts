import type { Transaction } from '@/shared/types'

export interface SelectionTotal {
  currency: string
  /** What came in minus what went out; negative when more went out */
  net: number
  incoming: number
  outgoing: number
}

/**
 * What the selected transactions add up to, one total per currency. A row in a currency that has no exchange rate
 * stays in its own currency, so adding it to the rest would be wrong. The base currency comes first.
 * Excluded transactions count: they are selected, so they are in the sum.
 */
export function selectionTotals(transactions: Transaction[], selected: Set<string>, base: string): SelectionTotal[] {
  const totals = new Map<string, SelectionTotal>()

  for (const t of transactions) {
    if (!selected.has(t.id)) {
      continue
    }
    const currency = t.currency || base
    const total = totals.get(currency) ?? { currency, net: 0, incoming: 0, outgoing: 0 }

    if (t.type === 'income') {
      total.incoming += t.amount
    } else {
      total.outgoing += t.amount
    }
    total.net = total.incoming - total.outgoing
    totals.set(currency, total)
  }

  return [...totals.values()].sort((a, b) => Number(b.currency === base) - Number(a.currency === base))
}
