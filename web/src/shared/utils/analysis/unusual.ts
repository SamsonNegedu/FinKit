import type { Transaction } from '@/shared/types'
import { MS_PER_DAY } from '@/shared/constants/time'
import { displayNameOf } from '@/shared/utils/aliases'
import { normalizeMerchant } from '@/shared/utils/categorizer'
import { isCashWithdrawal } from '@/shared/utils/cashWithdrawal'
import { parseLocalDate } from '@/shared/utils/dates'

export interface Unusual {
  id: string
  kind: 'double' | 'newBig'
  merchant: string
  amount: number
  date: string
}

/** Below this a repeated payment is just coffee, not a mistake. */
const DOUBLE_MIN = 15
/** A first-time payee is only worth a mention when it is clearly large: at least this and several times a usual payment. */
const NEW_BIG_MIN = 200
const NEW_BIG_TIMES_MEDIAN = 3
/** Without this much history before it, everything looks new. */
const MIN_HISTORY_DAYS = 60
const SET_ASIDE = new Set(['Savings', 'Investment'])
const MAX_SHOWN = 3

/** A repeated round amount (200, 75) is almost always meant: real double charges are odd amounts like 89.90. */
const isRound = (amount: number) => Math.round(amount * 100) % 500 === 0

const nameOf = (t: Transaction) => normalizeMerchant(displayNameOf(t))

const isSpending = (t: Transaction) =>
  t.type === 'expense' && t.category !== 'Transfer' && !t.isExcluded && !SET_ASIDE.has(t.category || '')
const day = (t: Transaction) => parseLocalDate(t.date).getTime()
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)

  return s.length === 0 ? 0 : s[Math.floor(s.length / 2)]
}

/**
 * Payments worth a second look in a period: the same amount to the same payee twice within a day, and a large
 * payment to someone paid for the first time. `all` is everything, so "first time" and "usual" mean something.
 */
export function unusualOf(period: Transaction[], all: Transaction[]): Unusual[] {
  const out: Unusual[] = []
  // Money moving between your own accounts, or to someone who also pays you, is not a charge to question
  const ownNames = new Set(
    all.map(t => t.referenceAccountName && normalizeMerchant(t.referenceAccountName)).filter(Boolean),
  )
  const ownIbans = new Set(all.map(t => t.referenceAccount).filter(Boolean))
  const payers = new Set(all.filter(t => t.type === 'income').map(nameOf))
  const isPerson = (t: Transaction) =>
    ownNames.has(nameOf(t)) || payers.has(nameOf(t)) || (!!t.recipientIban && ownIbans.has(t.recipientIban))
  const spending = period.filter(isSpending).filter(t => !isPerson(t) && !isCashWithdrawal(t))
  const groups = new Map<string, Transaction[]>()

  for (const t of spending) {
    if (!t.isRecurring && t.amount >= DOUBLE_MIN && !isRound(t.amount)) {
      const key = `${normalizeMerchant(displayNameOf(t))}|${Math.round(t.amount * 100)}`

      groups.set(key, [...(groups.get(key) ?? []), t])
    }
  }
  for (const [key, rows] of groups) {
    const sorted = [...rows].sort((a, b) => day(a) - day(b))
    const pair = sorted.find((t, i) => i > 0 && day(t) - day(sorted[i - 1]) <= MS_PER_DAY)

    if (pair) {
      out.push({
        id: `double:${key}`,
        kind: 'double',
        merchant: displayNameOf(pair),
        amount: pair.amount,
        date: pair.date,
      })
    }
  }

  const allSpending = all.filter(isSpending)
  const earliest = Math.min(...allSpending.map(day))
  const usual = median(allSpending.map(t => t.amount))
  const seen = new Map<string, Transaction[]>()

  for (const t of allSpending) {
    const key = normalizeMerchant(displayNameOf(t))

    seen.set(key, [...(seen.get(key) ?? []), t])
  }
  for (const t of spending) {
    const key = normalizeMerchant(displayNameOf(t))
    const history = seen.get(key) ?? []

    if (
      history.length === 1 &&
      t.amount >= Math.max(NEW_BIG_MIN, usual * NEW_BIG_TIMES_MEDIAN) &&
      day(t) - earliest >= MIN_HISTORY_DAYS * MS_PER_DAY
    ) {
      out.push({ id: `new:${key}`, kind: 'newBig', merchant: displayNameOf(t), amount: t.amount, date: t.date })
    }
  }

  return out.sort((a, b) => b.amount - a.amount).slice(0, MAX_SHOWN)
}
