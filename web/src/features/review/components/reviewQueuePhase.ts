import type { Transaction } from '@/shared/types'
import { buildReviewGroups } from './reviewQueueUtils'

export type ReviewQueuePhase = 'empty' | 'triaging' | 'all_skipped'

export type ReviewSessionState = {
  skipped: Set<string>
  focusKey: string | null
  totalAtStart: number | null
}

export type ReviewSessionAction =
  | { type: 'SKIP'; merchantKey: string }
  | { type: 'FOCUS'; merchantKey: string | null }
  | { type: 'RESET_SKIPPED' }
  | { type: 'CAPTURE_TOTAL'; count: number }

export function reviewSessionReducer(state: ReviewSessionState, action: ReviewSessionAction): ReviewSessionState {
  switch (action.type) {
    case 'SKIP':
      return { ...state, skipped: new Set(state.skipped).add(action.merchantKey), focusKey: null }
    case 'FOCUS':
      return { ...state, focusKey: action.merchantKey }
    case 'RESET_SKIPPED':
      return { ...state, skipped: new Set(), focusKey: null }
    case 'CAPTURE_TOTAL':
      return state.totalAtStart === null ? { ...state, totalAtStart: action.count } : state
    default:
      return state
  }
}

export function deriveReviewQueuePhase(
  transactions: Transaction[],
  session: ReviewSessionState,
): {
  phase: ReviewQueuePhase
  groups: ReturnType<typeof buildReviewGroups>
  current: ReturnType<typeof buildReviewGroups>[number] | undefined
  pending: ReturnType<typeof buildReviewGroups>
  upNext: ReturnType<typeof buildReviewGroups>
  transactionsLeft: number
  done: number
  total: number
} {
  const groups = buildReviewGroups(transactions)
  const pending = groups.filter(g => !session.skipped.has(g.key))
  const focused = session.focusKey ? pending.find(g => g.key === session.focusKey) : undefined
  const current = focused ?? pending[0]
  const upNext = pending.filter(g => g !== current).slice(0, 6)
  const transactionsLeft = pending.reduce((n, g) => n + g.items.length, 0)
  const total = session.totalAtStart ?? groups.length
  const done = Math.max(0, total - groups.length)

  if (groups.length === 0) {
    return { phase: 'empty', groups, current: undefined, pending, upNext, transactionsLeft, done, total }
  }
  if (!current) {
    return { phase: 'all_skipped', groups, current, pending, upNext, transactionsLeft, done, total }
  }
  return { phase: 'triaging', groups, current, pending, upNext, transactionsLeft, done, total }
}
