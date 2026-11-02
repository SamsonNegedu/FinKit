import type { Contract, ContractTotals } from '../api/contracts.api'

const DAY = 86_400_000
const UPCOMING_DAYS = 14
const ENDED_WITHIN_DAYS = 150
const t = (d: string) => new Date(`${d}T00:00:00Z`).getTime()
const round2 = (n: number) => Math.round(n * 100) / 100

export interface Insights {
  /** Running contracts whose latest payment is dearer than before */
  rises: Contract[]
  /** Found after the first batch, not yet confirmed or dismissed */
  fresh: Contract[]
  /** Stopped recently: cancelled, or now paid from somewhere else */
  ended: Contract[]
  /** Due in the next two weeks, soonest first */
  upcoming: Array<{ contract: Contract; date: string }>
  /** What is still to be paid before the month ends, in one currency */
  leftThisMonth: number
}

/** What needs a look and what is coming up, worked out from the contracts alone. */
export function insightsOf(contracts: Contract[], today: string, currency: string): Insights {
  const live = contracts.filter(c => c.state !== 'dismissed')
  const running = live.filter(c => c.active)
  const horizon = t(today) + UPCOMING_DAYS * DAY
  const monthEnd = new Date(t(today))

  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0)
  const upcoming = running
    .filter(c => c.nextExpected && t(c.nextExpected) >= t(today) && t(c.nextExpected) <= horizon)
    .map(c => ({ contract: c, date: c.nextExpected! }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    rises: running.filter(c => c.priceChange && c.priceChange.to > c.priceChange.from),
    fresh: live.filter(c => c.isNew && c.state === 'detected'),
    ended: live.filter(c => !c.active && c.lastDate && t(today) - t(c.lastDate) <= ENDED_WITHIN_DAYS * DAY),
    upcoming,
    leftThisMonth: round2(
      running
        .filter(
          c =>
            c.currency === currency &&
            c.nextExpected &&
            t(c.nextExpected) >= t(today) &&
            t(c.nextExpected) <= monthEnd.getTime(),
        )
        .reduce((sum, c) => sum + c.amount, 0),
    ),
  }
}

/** One total in the base currency using the rates you entered; currencies without a rate are kept apart. */
export function combineTotals(totals: ContractTotals[], base: string, rates: Record<string, number>) {
  const combined: ContractTotals = { currency: base, monthly: 0, fixed: 0, variable: 0, byGroup: {} }
  const unconverted: ContractTotals[] = []

  for (const x of totals) {
    const rate = x.currency === base ? 1 : rates[x.currency]

    if (!(rate > 0)) {
      unconverted.push(x)
      continue
    }
    combined.monthly = round2(combined.monthly + x.monthly * rate)
    combined.fixed = round2(combined.fixed + x.fixed * rate)
    combined.variable = round2(combined.variable + x.variable * rate)
    for (const [g, v] of Object.entries(x.byGroup)) {
      combined.byGroup[g] = round2((combined.byGroup[g] ?? 0) + v * rate)
    }
  }

  return { combined, unconverted }
}
