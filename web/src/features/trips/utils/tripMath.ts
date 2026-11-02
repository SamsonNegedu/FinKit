import type { Slice, TripMoney, TripTotals } from '../api/trips.api'

const round = (n: number) => Math.round(n * 100) / 100

function mergeSlices<K extends 'category' | 'place'>(
  parts: Array<Array<Record<K, string> & Slice>>,
  key: K,
): Array<Record<K, string> & Slice> {
  const sums = new Map<string, number>()

  for (const list of parts) {
    for (const item of list) {
      sums.set(item[key], (sums.get(item[key]) ?? 0) + item.amount)
    }
  }
  const paidOut = [...sums.values()].reduce((sum, a) => sum + Math.max(a, 0), 0)

  return [...sums]
    .map(([label, amount]) => ({
      [key]: label,
      amount: round(amount),
      share: amount > 0 && paidOut > 0 ? round((amount / paidOut) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount) as unknown as Array<Record<K, string> & Slice>
}

const scaleSlices = <T extends { amount: number }>(items: T[], rate: number): T[] =>
  items.map(i => ({ ...i, amount: round(i.amount * rate) }))

/**
 * One total in the base currency from several currencies, using the rates the person entered
 * (1 unit of a currency = rate units of the base). Currencies without a rate stay as their own totals,
 * because adding them in unconverted would be wrong.
 */
export function combineTotals(totals: TripTotals[], base: string, rates: Record<string, number>) {
  const rateOf = (c: string) => (c === base ? 1 : rates[c] > 0 ? rates[c] : undefined)
  const convertible = totals.filter(t => rateOf(t.currency) !== undefined)
  const separate = totals.filter(t => rateOf(t.currency) === undefined)

  if (convertible.length === 0) {
    return { combined: undefined, separate, converted: [] as string[] }
  }
  const scaled = convertible.map(t => ({ t, r: rateOf(t.currency)! }))
  const sum = (pick: (t: TripTotals) => number) => round(scaled.reduce((acc, { t, r }) => acc + pick(t) * r, 0))
  const days = new Map<string, number>()
  const owed = new Map<string, number>()

  for (const { t, r } of scaled) {
    for (const d of t.byDay) {
      days.set(d.date, (days.get(d.date) ?? 0) + d.amount * r)
    }
    for (const s of t.settlement) {
      owed.set(s.name, (owed.get(s.name) ?? 0) + s.amount * r)
    }
  }
  const subs = new Map<string, TripTotals['bySubcategory'][number]>()

  for (const { t, r } of scaled) {
    for (const s of t.bySubcategory) {
      const key = `${s.category}\u0000${s.subcategory}`

      subs.set(key, { ...s, amount: (subs.get(key)?.amount ?? 0) + s.amount * r })
    }
  }
  const combined: TripTotals = {
    currency: base,
    funded: sum(t => t.funded),
    spent: sum(t => t.spent),
    remaining: sum(t => t.remaining),
    mine: sum(t => t.mine),
    byCategory: mergeSlices(
      scaled.map(({ t, r }) => scaleSlices(t.byCategory, r)),
      'category',
    ),
    bySubcategory: [...subs.values()].map(s => ({ ...s, amount: round(s.amount) })).sort((a, b) => b.amount - a.amount),
    byPlace: mergeSlices(
      scaled.map(({ t, r }) => scaleSlices(t.byPlace, r)),
      'place',
    ),
    byDay: [...days]
      .map(([date, amount]) => ({ date, amount: round(amount) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byPhase: {
      before: sum(t => t.byPhase.before),
      during: sum(t => t.byPhase.during),
      after: sum(t => t.byPhase.after),
    },
    settlement: [...owed].map(([name, amount]) => ({ name, amount: round(amount) })).filter(s => s.amount !== 0),
  }

  return { combined, separate, converted: convertible.map(t => t.currency).filter(c => c !== base) }
}

/**
 * A trip's money in the base currency, for the list. Currencies without a rate are left out, and `partial`
 * says so, because adding them in unconverted would be wrong.
 */
export function moneyInBase(totals: TripMoney[], base: string, rates: Record<string, number>) {
  const rateOf = (c: string) => (c === base ? 1 : rates[c] > 0 ? rates[c] : undefined)
  const usable = totals.filter(t => rateOf(t.currency) !== undefined)
  const sum = (pick: (t: TripMoney) => number) =>
    round(usable.reduce((acc, t) => acc + pick(t) * rateOf(t.currency)!, 0))

  return {
    spent: sum(t => t.spent),
    funded: sum(t => t.funded),
    remaining: sum(t => t.remaining),
    partial: usable.length < totals.length,
    /** A budget set in another currency, in the base one; undefined when there is no rate for it */
    budget: (amount: number, currency: string) => {
      const rate = rateOf(currency)

      return rate === undefined ? undefined : round(amount * rate)
    },
  }
}

const DAY = 86_400_000

/** Days of travel when both dates are set, otherwise the number of days anything was spent. */
export function tripLength(trip: { startDate: string | null; endDate: string | null }, spendDays: number): number {
  if (trip.startDate && trip.endDate) {
    return Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / DAY) + 1
  }

  return spendDays
}
