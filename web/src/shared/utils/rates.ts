import { Transaction } from '@/shared/types'

// Manually entered exchange rates: 1 unit of <currency> = <rate> units of the base currency.
const KEY = 'finkit.rates'

export type RateMap = Record<string, number>

// Rates are stored per base currency: "1 USD = 0.9" means 0.9 EUR only while EUR is the base.
// The base is the most common currency in the data, so it can change when data is added.
export type RateStore = Record<string, RateMap>

export function loadRateStore(): RateStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}')

    // Ignore the old flat format ({ USD: 0.9 }): we can't tell which base it meant
    return Object.values(parsed).every(v => v && typeof v === 'object') ? parsed : {}
  } catch {
    return {}
  }
}

export function saveRateStore(store: RateStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // preference just won't persist
  }
}

// The currency most transactions are in
export function baseCurrencyOf(txs: Transaction[]): string {
  const counts = new Map<string, number>()

  for (const t of txs) {
    counts.set(t.currency || 'EUR', (counts.get(t.currency || 'EUR') || 0) + 1)
  }
  let best = 'EUR'
  let max = 0

  for (const [c, n] of counts) {
    if (n > max) {
      best = c
      max = n
    }
  }

  return best
}

export function foreignCurrenciesOf(txs: Transaction[], base: string): string[] {
  return [...new Set(txs.map(t => t.currency).filter(c => c && c !== base))]
}

/** Convert foreign-currency rows to the base currency where a rate is known; others stay as they are. */
export function applyRates(txs: Transaction[], base: string, rates: RateMap): Transaction[] {
  return txs.map(t => {
    const rate = rates[t.currency]

    if (t.currency === base || !rate || !(rate > 0)) {
      return t
    }

    return {
      ...t,
      originalAmount: t.amount,
      originalCurrency: t.currency,
      amount: Math.round(t.amount * rate * 100) / 100,
      currency: base,
    }
  })
}
