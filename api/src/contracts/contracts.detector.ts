import type { BankTransaction } from '../bank-connections/providers/bank-provider'
import { merchantName, normalizeMerchant } from './merchant-key'
import type { Detected, Frequency } from './contracts.types'

const DAY = 86_400_000

/** Expected days between payments, how far a payment may be off, and payments needed to call it a contract. */
const PERIODS: Record<Frequency, { days: number; slack: number; minPayments: number; perMonth: number }> = {
  monthly: { days: 30.4, slack: 6, minPayments: 3, perMonth: 1 }, // 3 months, the "more than 2-3 months" rule
  quarterly: { days: 91, slack: 12, minPayments: 3, perMonth: 1 / 3 },
  yearly: { days: 365, slack: 21, minPayments: 2, perMonth: 1 / 12 },
}
/** Share of the gaps that must fit the period: one skipped or late payment does not break a contract. */
/** Enough payments to show a contract's history; a longer one keeps its most recent. */
const MAX_REFS = 500
const REGULAR_SHARE = 0.75
/** A payment that differs from the one before by more than this is a change of price (or a drifting bill). */
const STEP = 0.05
/** The latest payments must stay within half of their typical amount, or it is not steady enough to call a contract. */
const VARIABLE_BAND = 0.5
const RECENT = 6
/** A price change this recent is still worth pointing out. */
const RECENT_STEP_PAYMENTS = 3

const t = (d: string) => new Date(`${d}T00:00:00Z`).getTime()
const median = (xs: number[]) => {
  const s = xs.toSorted((a, b) => a - b)
  const m = Math.floor(s.length / 2)

  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const round2 = (n: number) => Math.round(n * 100) / 100

function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.getUTCDate()

  d.setUTCMonth(d.getUTCMonth() + months, 1)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()

  d.setUTCDate(Math.min(day, last))

  return d.toISOString().slice(0, 10)
}

const MONTHS: Record<Frequency, number> = { monthly: 1, quarterly: 3, yearly: 12 }

const monthIndex = (d: string) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7))

/** Paid in at least three-quarters of the months between its first and last payment, on about the same day. */
function coversMonths(rows: Array<{ date: string }>): boolean {
  const months = new Set(rows.map(r => monthIndex(r.date)))
  const span = monthIndex(rows[rows.length - 1].date) - monthIndex(rows[0].date) + 1
  const days = rows.map(r => Number(r.date.slice(8, 10)))
  const usual = median(days)

  return (
    rows.length >= PERIODS.monthly.minPayments &&
    months.size / span >= REGULAR_SHARE &&
    days.every(d => Math.abs(d - usual) <= PERIODS.monthly.slack + 3)
  )
}

function frequencyOf(gaps: number[]): Frequency | null {
  for (const f of ['monthly', 'quarterly', 'yearly'] as const) {
    const { days, slack } = PERIODS[f]
    const fit = gaps.filter(g => Math.abs(g - days) <= slack).length

    if (gaps.length > 0 && fit / gaps.length >= REGULAR_SHARE) {
      return f
    }
  }

  return null
}

export interface DetectedContract {
  /** Normalized merchant, the identity of a contract */
  key: string
  currency: string
  detected: Detected
}

/** Money going out to the same payee on a steady rhythm, for long enough to count as a contract. */
export function detectContracts(txs: Array<BankTransaction & { ref?: string }>): DetectedContract[] {
  const groups = new Map<
    string,
    { name: string; sample: string; currency: string; rows: Array<{ date: string; amount: number; ref?: string }> }
  >()

  for (const tx of txs) {
    // Only money out; money moved between the person's own accounts is not a running cost
    if (tx.amount >= 0 || (tx.recipientIban && tx.recipientIban === tx.referenceAccount)) {
      continue
    }
    const name = merchantName(tx)
    const key = normalizeMerchant(name)

    if (key.length < 2) {
      continue
    }
    const id = `${key}|${tx.currency}`
    const group = groups.get(id) ?? { name, sample: tx.description, currency: tx.currency, rows: [] }

    group.rows.push({ date: tx.date, amount: -tx.amount, ref: tx.ref })
    groups.set(id, group)
  }

  const out: DetectedContract[] = []

  for (const [id, g] of groups) {
    const sorted = g.rows.toSorted((a, b) => a.date.localeCompare(b.date))

    // A contract is paid about once per period. A shop or café visited several times a month is spending, not a contract.
    if (typicalPaymentsPerMonth(sorted) > 1) {
      continue
    }
    const rows = collapseSameMonth(sorted)
    const gaps = rows.slice(1).map((r, i) => (t(r.date) - t(rows[i].date)) / DAY)
    // A paused or late month breaks the gap rhythm, so a monthly pattern is also accepted by how many months it covers
    const frequency = frequencyOf(gaps) ?? (coversMonths(rows) ? 'monthly' : null)

    if (!frequency || rows.length < PERIODS[frequency].minPayments) {
      continue
    }
    const amounts = rows.map(r => r.amount)
    const recent = amounts.slice(-RECENT)
    const recentTypical = median(recent)

    // Judged on the recent payments: a price that rose years ago should not rule a contract out
    if (Math.max(...recent.map(a => Math.abs(a - recentTypical) / recentTypical)) > VARIABLE_BAND) {
      continue
    }
    const steps = amounts.flatMap((a, i) => (i > 0 && Math.abs(a - amounts[i - 1]) / amounts[i - 1] > STEP ? [i] : []))
    // Fixed = a price that stays put and now and then steps (rent, a ticket); variable = it moves most months
    const fixed = steps.length <= Math.max(1, Math.floor((rows.length - 1) * 0.2))
    const last = rows.at(-1)!
    const lastStep = steps.at(-1)
    const changed = fixed && lastStep !== undefined && lastStep >= rows.length - RECENT_STEP_PAYMENTS

    out.push({
      key: id.split('|')[0],
      currency: g.currency,
      detected: {
        name: g.name,
        sample: g.sample,
        refs: sorted.flatMap(r => (r.ref ? [r.ref] : [])).slice(-MAX_REFS),
        kind: fixed ? 'fixed' : 'variable',
        frequency,
        // What it costs now: the current price for a fixed one, a recent average for one that moves
        amount: round2(fixed ? last.amount : recentTypical),
        lastAmount: round2(last.amount),
        firstDate: rows[0].date,
        lastDate: last.date,
        nextExpected: addMonths(last.date, MONTHS[frequency]),
        count: rows.length,
        priceChange: changed ? { from: round2(amounts[lastStep - 1]), to: round2(amounts[lastStep]) } : null,
      },
    })
  }

  return out
}

function typicalPaymentsPerMonth(rows: Array<{ date: string }>): number {
  const perMonth = new Map<string, number>()

  for (const r of rows) {
    const month = r.date.slice(0, 7)

    perMonth.set(month, (perMonth.get(month) ?? 0) + 1)
  }

  return median([...perMonth.values()])
}

/** Two payments in one month (a bill and its correction) count as one, so they do not break the rhythm. */
function collapseSameMonth(rows: Array<{ date: string; amount: number }>) {
  const out: Array<{ date: string; amount: number }> = []

  for (const r of rows) {
    const prev = out.at(-1)

    if (prev && prev.date.slice(0, 7) === r.date.slice(0, 7)) {
      prev.amount += r.amount
      prev.date = r.date
    } else {
      out.push({ ...r })
    }
  }

  return out
}

export const monthlyEquivalent = (amount: number, f: Frequency) => round2(amount * PERIODS[f].perMonth)

/** Active while the latest payment is not overdue by more than half a period. */
export function isActive(lastDate: string, f: Frequency, today: string): boolean {
  return t(today) - t(lastDate) <= PERIODS[f].days * 1.5 * DAY
}

/** The next date a hand-made contract falls due: its start date, repeated at its rhythm, from today on. */
export function nextDue(start: string, f: Frequency, today: string): string {
  let next = start

  for (let i = 1; next < today && i < 1200; i++) {
    next = addMonths(start, i * MONTHS[f])
  }

  return next
}
