import type { Transaction } from '@/shared/types'
import { buildReviewGroups } from './reviewQueueUtils'

export type ReviewQueuePhase = { kind: 'empty' } | { kind: 'all_skipped'; skippedCount: number } | { kind: 'triaging' }

export type ReviewGroup = ReturnType<typeof buildReviewGroups>[number]

export type DerivedReviewQueue = {
  phase: ReviewQueuePhase
  groups: ReviewGroup[]
  current: ReviewGroup | undefined
  pending: ReviewGroup[]
  upNext: ReviewGroup[]
  transactionsLeft: number
  done: number
  total: number
}

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

export function deriveReviewQueuePhase(transactions: Transaction[], session: ReviewSessionState): DerivedReviewQueue {
  const groups = buildReviewGroups(transactions)
  const pending = groups.filter(g => !session.skipped.has(g.key))
  const focused = session.focusKey ? pending.find(g => g.key === session.focusKey) : undefined
  const current = focused ?? pending[0]
  const upNext = pending.filter(g => g !== current).slice(0, 12)
  const transactionsLeft = pending.reduce((n, g) => n + g.items.length, 0)
  const total = session.totalAtStart ?? groups.length
  const done = Math.max(0, total - groups.length)
  const base = { groups, current, pending, upNext, transactionsLeft, done, total }

  if (groups.length === 0) {
    return { ...base, phase: { kind: 'empty' } }
  }
  if (!current) {
    return { ...base, phase: { kind: 'all_skipped', skippedCount: session.skipped.size } }
  }

  return { ...base, phase: { kind: 'triaging' } }
}
