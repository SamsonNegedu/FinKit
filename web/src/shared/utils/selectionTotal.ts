import type { Transaction } from '@/shared/types'
import { moneyMinor, fromMoneyMinor } from './money'

const NET_EPS = 0.005

export function netAmountClass(net: number): string {
  if (net > NET_EPS) {
    return 'text-income'
  }
  if (net < -NET_EPS) {
    return 'text-expense'
  }

  return 'text-midnight-300'
}

export function netAmountPrefix(net: number): string {
  if (net > NET_EPS) {
    return '+'
  }

  return ''
}

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
    let incomingMinor = moneyMinor(total.incoming)
    let outgoingMinor = moneyMinor(total.outgoing)

    if (t.type === 'income') {
      incomingMinor += moneyMinor(t.amount)
    } else {
      outgoingMinor += moneyMinor(t.amount)
    }
    total.incoming = fromMoneyMinor(incomingMinor)
    total.outgoing = fromMoneyMinor(outgoingMinor)
    total.net = fromMoneyMinor(incomingMinor - outgoingMinor)
    totals.set(currency, total)
  }

  return [...totals.values()].sort((a, b) => Number(b.currency === base) - Number(a.currency === base))
}
