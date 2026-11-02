import { formatCurrency } from '@/shared/utils/format'
import type { Analysis } from './analyze'
import type { Unusual } from './unusual'

export interface Highlight {
  id: string
  /** One plain sentence */
  text: string
  tone: 'neutral' | 'up' | 'down'
  /** A flagged payment can be wrong, so the person may dismiss it for good */
  dismissable?: boolean
  /** What opening it shows; none for a finding with no single set of transactions behind it */
  target?: { kind: 'category'; category: string } | { kind: 'merchant'; merchant: string }
}

const MIN_CHANGE_EUR = 20
const MIN_CHANGE_SHARE = 0.15
/** Past this share, "Other" is hiding too much for the rest of the picture to be trusted. */
const OTHER_WORTH_SORTING = 10

/** A few plain-language findings, each pointing at the transactions behind it. Only what is actually notable. */
export function highlightsOf(a: Analysis, currency: string, unusual: Unusual[] = []): Highlight[] {
  const out: Highlight[] = []
  const money = (n: number) => formatCurrency(n, currency)
  const top = a.categories[0]

  if (top && a.spent > 0) {
    out.push({
      id: 'top',
      text: `${top.category} is your biggest cost: ${money(top.total)}, ${Math.round(top.share)}% of what you spent.`,
      tone: 'neutral',
      target: { kind: 'category', category: top.category },
    })
  }
  const changes = a.categories
    .filter(c => c.previous !== null && c.previous > 0)
    .map(c => ({ c, delta: c.total - c.previous! }))
    .filter(x => Math.abs(x.delta) >= MIN_CHANGE_EUR && Math.abs(x.delta) / x.c.previous! >= MIN_CHANGE_SHARE)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
  const change = changes[0]

  if (change) {
    const up = change.delta > 0

    out.push({
      id: 'change',
      text: `${change.c.category} ${up ? 'rose' : 'fell'} by ${money(Math.abs(change.delta))} (${Math.round(
        (Math.abs(change.delta) / change.c.previous!) * 100,
      )}%) compared with the period before.`,
      tone: up ? 'up' : 'down',
      target: { kind: 'category', category: change.c.category },
    })
  }
  if (a.largest) {
    out.push({
      id: 'largest',
      text: `Your largest payment was ${money(a.largest.tx.amount)} to ${a.largest.name}.`,
      tone: 'neutral',
      target: { kind: 'merchant', merchant: a.largest.name },
    })
  }
  for (const u of unusual) {
    out.push({
      id: u.id,
      text:
        u.kind === 'double'
          ? `Possible double charge: ${money(u.amount)} to ${u.merchant}, paid twice within a day.`
          : `New payee: ${money(u.amount)} to ${u.merchant}, paid for the first time and well above a usual payment.`,
      tone: 'up',
      dismissable: true,
      target: { kind: 'merchant', merchant: u.merchant },
    })
  }
  if (a.untaggedCash.count > 0) {
    const n = a.untaggedCash.count

    out.push({
      id: 'cash',
      text: `${money(a.untaggedCash.total)} taken out as cash (${n} withdrawal${n === 1 ? '' : 's'}) has no purpose yet. Say what each was for in Review.`,
      tone: 'up',
      target: { kind: 'category', category: 'Cash' },
    })
  }
  const other = a.categories.find(c => c.category === 'Other')

  if (other && other.share >= OTHER_WORTH_SORTING) {
    out.push({
      id: 'other',
      text: `${Math.round(other.share)}% of your spending (${money(other.total)}) is still in Other. Sorting it makes everything here more accurate.`,
      tone: 'up',
      target: { kind: 'category', category: 'Other' },
    })
  }
  if (a.spent > 0 && a.repeating > 0) {
    out.push({
      id: 'repeating',
      text: `${money(a.repeating)} (${Math.round((a.repeating / a.spent) * 100)}%) of your spending repeats on a schedule.`,
      tone: 'neutral',
    })
  }

  return out
}
