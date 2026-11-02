import type { Transaction } from '@/shared/types'
import { displayNameOf } from '@/shared/utils/aliases'
import { guessTripItem, isTravelBooking, type TripGuess } from './tripGuess'

export interface Candidate {
  ref: string
  t: Transaction
  guess: TripGuess | null
}

const textOf = (t: Transaction) => `${displayNameOf(t)} ${t.description}`

/**
 * Transactions that might belong to a trip: those inside its travel dates, and every flight and stay paid before
 * it, nearest first. There is no cutoff: a booking can be made a year ahead, and a past trip is sorted out long
 * after. A booking has no destination in its text, so it is only offered, never assumed: you pick.
 */
export function tripCandidates(
  transactions: Transaction[],
  refOf: (t: Transaction) => string | undefined,
  skipped: ReadonlySet<string>,
  start: string,
  end: string,
): { inside: Candidate[]; earlier: Candidate[] } {
  const inside: Candidate[] = []
  const earlier: Candidate[] = []

  for (const t of transactions) {
    const ref = refOf(t)

    if (!ref || skipped.has(ref) || t.category === 'Transfer' || t.type !== 'expense') {
      continue
    }
    const guess = guessTripItem(textOf(t))

    if (t.date >= start && t.date <= end) {
      inside.push({ ref, t, guess })
    } else if (t.date < start && isTravelBooking(textOf(t))) {
      earlier.push({ ref, t, guess })
    }
  }

  // The closest to the trip first: the booking you are looking for is usually the latest one before it
  earlier.sort((a, b) => b.t.date.localeCompare(a.t.date))

  return { inside, earlier }
}
