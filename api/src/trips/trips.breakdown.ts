import type { BankTransaction } from '../bank-connections/providers/bank-provider'

export interface TripLine {
  ref: string
  kind: 'cost' | 'funding'
  category: string | null
  subcategory: string | null
  place: string | null
  shared: boolean
  paidBy: string | null
  tx: BankTransaction
}

interface Slice {
  amount: number
  share: number
}

export interface CurrencyBreakdown {
  currency: string
  funded: number
  spent: number
  remaining: number
  /** Your own part of what was spent: shared costs count only your share */
  mine: number
  byCategory: Array<{ category: string } & Slice>
  /** What was spent per subcategory, only where one was given; the rest of a category is not listed here */
  bySubcategory: Array<{ category: string; subcategory: string; amount: number }>
  byPlace: Array<{ place: string } & Slice>
  byDay: Array<{ date: string; amount: number }>
  // Booked before the travel dates, during them, after them. Without dates everything is "during".
  byPhase: { before: number; during: number; after: number }
  /** Per traveler: positive means they owe you, negative means you owe them */
  settlement: Array<{ name: string; amount: number }>
}

const round = (n: number) => Math.round(n * 100) / 100

/** Amounts by label, largest first. Shares are of what was paid out; a label that nets to a refund has none. */
function slices<K extends string>(totals: Map<string, number>, key: K) {
  const paidOut = [...totals.values()].reduce((sum, a) => sum + Math.max(a, 0), 0)

  return [...totals]
    .map(([label, amount]) => ({
      [key]: label,
      amount: round(amount),
      share: amount > 0 && paidOut > 0 ? round((amount / paidOut) * 100) : 0,
    }))
    .toSorted((a, b) => b.amount - a.amount) as Array<Record<K, string> & Slice>
}

const add = (map: Map<string, number>, key: string, amount: number) => map.set(key, (map.get(key) ?? 0) + amount)

/**
 * Money in and out of a trip, per currency (amounts in different currencies are never added together).
 * Funding is what moved into the trip's balance. A cost's amount is negative when money went out, so
 * a refund inside a trip lowers what was spent.
 */
export function breakdown(
  lines: TripLine[],
  trip: { startDate: string | null; endDate: string | null; travelers: string[] },
): CurrencyBreakdown[] {
  const byCurrency = new Map<string, TripLine[]>()

  for (const line of lines) {
    byCurrency.set(line.tx.currency, [...(byCurrency.get(line.tx.currency) ?? []), line])
  }
  const people = trip.travelers.length + 1

  return [...byCurrency].map(([currency, group]) => {
    const categories = new Map<string, number>()
    const subcategories = new Map<string, { category: string; subcategory: string; amount: number }>()
    const places = new Map<string, number>()
    const days = new Map<string, number>()
    const owed = new Map<string, number>()
    const byPhase = { before: 0, during: 0, after: 0 }
    let spent = 0
    let mine = 0

    for (const { tx, category, subcategory, place, shared, paidBy, kind } of group) {
      if (kind !== 'cost') {
        continue
      }
      const amount = -tx.amount
      const phase =
        trip.startDate && tx.date < trip.startDate
          ? 'before'
          : trip.endDate && tx.date > trip.endDate
            ? 'after'
            : 'during'

      spent += amount
      byPhase[phase] += amount
      add(categories, category ?? 'Other', amount)
      if (subcategory) {
        const key = `${category ?? 'Other'}\u0000${subcategory}`
        const before = subcategories.get(key)

        subcategories.set(key, {
          category: category ?? 'Other',
          subcategory,
          amount: (before?.amount ?? 0) + amount,
        })
      }
      add(places, place ?? 'Not assigned', amount)
      add(days, tx.date, amount)
      if (!shared) {
        // Something paid by someone else and not shared is theirs alone
        mine += paidBy ? 0 : amount

        continue
      }
      const part = amount / people

      mine += part
      if (paidBy) {
        add(owed, paidBy, -part)
      } else {
        for (const name of trip.travelers) {
          add(owed, name, part)
        }
      }
    }
    const funded = group.filter(l => l.kind === 'funding').reduce((sum, l) => sum + Math.abs(l.tx.amount), 0)

    return {
      currency,
      funded: round(funded),
      spent: round(spent),
      remaining: round(funded - spent),
      mine: round(mine),
      byCategory: slices(categories, 'category'),
      bySubcategory: [...subcategories.values()]
        .map(s => ({ ...s, amount: round(s.amount) }))
        .toSorted((a, b) => b.amount - a.amount),
      byPlace: slices(places, 'place'),
      byDay: [...days]
        .map(([date, amount]) => ({ date, amount: round(amount) }))
        .toSorted((a, b) => a.date.localeCompare(b.date)),
      byPhase: { before: round(byPhase.before), during: round(byPhase.during), after: round(byPhase.after) },
      settlement: [...owed].map(([name, amount]) => ({ name, amount: round(amount) })).filter(s => s.amount !== 0),
    }
  })
}
