import type { Contract } from '../api/contracts.api'

export interface ContractGroup {
  name: string
  contracts: Contract[]
  monthly: number
}

/** A monthly amount in the base currency, or null when it is in a currency without a rate. */
export type ToBase = (monthly: number, currency: string) => number | null

/** Running contracts first, grouped by category with the dearest group on top; ended and dismissed ones sit apart. */
export function groupContracts(contracts: Contract[], toBase: ToBase) {
  const mine = contracts.filter(c => c.state !== 'dismissed')
  const running = mine.filter(c => c.active)
  // Your own categories, dearest first: whatever a contract is filed under becomes a group
  const names = [...new Set(running.map(c => c.group))]
  const groups: ContractGroup[] = names
    .map(name => {
      const items = running
        .filter(c => c.group === name)
        .sort((a, b) => (toBase(b.monthly, b.currency) ?? 0) - (toBase(a.monthly, a.currency) ?? 0))

      return {
        name,
        contracts: items,
        monthly: items.reduce((sum, c) => sum + (toBase(c.monthly, c.currency) ?? 0), 0),
      }
    })
    .sort((a, b) => b.monthly - a.monthly)

  return {
    groups,
    ended: mine.filter(c => !c.active),
    dismissed: contracts.filter(c => c.state === 'dismissed'),
  }
}

export const FREQUENCY_LABEL = { monthly: 'month', quarterly: 'quarter', yearly: 'year' } as const

export const FREQUENCY_TITLE: Record<keyof typeof FREQUENCY_LABEL, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

/** Monthly cost in the base currency, or null when that currency has no rate. */
export function monthlyInBase(
  monthly: number,
  from: string,
  base: string,
  rates: Record<string, number>,
): number | null {
  if (from === base) {
    return monthly
  }
  if (rates[from] > 0) {
    return monthly * rates[from]
  }

  return null
}
