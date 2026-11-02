import type { Transaction } from '@/shared/types'

// Every withdrawal reads the same ("Geldautomat", "Withdrawn Transaction"), so to a merchant rule they are one
// payee, yet each can be for something different. They are told apart by text, since banks give no better signal.
const WITHDRAWAL =
  /\b(geldautomat|bargeld(auszahlung)?|auszahlung|abhebung|geldausgabe|atm|cash\s+withdrawal|cash\s+advance|withdrawn|withdrawal)\b/i

/** An ATM or counter cash withdrawal: money out that becomes cash in your hand. */
export function isCashWithdrawal(t: Pick<Transaction, 'type' | 'description' | 'recipient' | 'merchant'>): boolean {
  return t.type === 'expense' && WITHDRAWAL.test(`${t.description} ${t.recipient ?? ''} ${t.merchant ?? ''}`)
}
