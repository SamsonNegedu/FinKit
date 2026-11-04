import type { Frequency } from '../api/contracts.api'

export interface PickedPayment {
  date: string
  amount: number
  name: string
}

const DAY = 86_400_000
/** Payments that differ from the typical one by more than this count as moving (a drifting bill). */
const STEP = 0.05
/** Same share the server's detector allows for a price that stays put and now and then steps. */
const MOVING_SHARE = 0.2

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)

  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Name, typical amount and rhythm guessed from the payments picked; the person edits whatever is off. */
export function prefillFromPayments(payments: PickedPayment[]) {
  const amounts = payments.map(p => Math.abs(p.amount))
  const typical = amounts.length > 0 ? median(amounts) : 0
  const dates = payments.map(p => new Date(`${p.date}T00:00:00Z`).getTime()).sort((a, b) => a - b)
  const gaps = dates.slice(1).map((d, i) => (d - dates[i]) / DAY)
  // Under half a year apart is quarterly at most; anything near a year is yearly; one payment says nothing, so monthly
  const gap = gaps.length > 0 ? median(gaps) : 30
  const frequency: Frequency = gap <= 45 ? 'monthly' : gap <= 200 ? 'quarterly' : 'yearly'
  const moving = amounts.filter(a => typical > 0 && Math.abs(a - typical) / typical > STEP).length
  const names = new Map<string, number>()

  for (const p of payments) {
    names.set(p.name, (names.get(p.name) ?? 0) + 1)
  }

  return {
    name: [...names].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
    amount: Math.round(typical * 100) / 100,
    frequency,
    kind: moving / Math.max(1, amounts.length) > MOVING_SHARE ? ('variable' as const) : ('fixed' as const),
  }
}
