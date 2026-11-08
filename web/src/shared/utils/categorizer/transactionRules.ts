import type { Transaction } from '@/shared/types'
import { normalizeMerchant } from './learnedMappings'

/** What a rule looks for. Every condition given must hold. Kept in step with RuleMatch in the API's schemas. */
export interface RuleMatch {
  payee?: string
  words?: string[]
  /** The size of the payment, ignoring its sign */
  amount?: number
  /** The other side's account number: the one thing that tells your own savings account from any other transfer */
  iban?: string
}
export interface TransactionRule {
  id: string
  match: RuleMatch
  category: string
  detail?: string
}

let rules: TransactionRule[] = []

export function setTransactionRules(next: TransactionRule[]): void {
  rules = next
}

export function addLocalRule(rule: TransactionRule): void {
  rules = [...rules, rule]
}

export function removeLocalRule(id: string): void {
  rules = rules.filter(r => r.id !== id)
}

const normalizeIban = (v: string) => v.replace(/\s+/g, '').toUpperCase()

type RuleInput = Pick<Transaction, 'recipient' | 'description' | 'amount' | 'recipientIban'>

const conditionCount = (m: RuleMatch) =>
  (m.payee ? 1 : 0) + (m.words?.length ?? 0) + (m.amount === undefined ? 0 : 1) + (m.iban ? 1 : 0)

function matches(m: RuleMatch, tx: RuleInput): boolean {
  if (m.iban && normalizeIban(tx.recipientIban ?? '') !== normalizeIban(m.iban)) {
    return false
  }
  if (m.payee && !` ${normalizeMerchant(tx.recipient ?? '')} `.includes(` ${normalizeMerchant(m.payee)} `)) {
    return false
  }
  const text = normalizeMerchant(tx.description)

  if (m.words?.some(w => !text.includes(normalizeMerchant(w)))) {
    return false
  }

  // Cents, so 8.99 and 8.990000001 from a float sum are the same payment
  return m.amount === undefined || Math.round(Math.abs(tx.amount) * 100) === Math.round(m.amount * 100)
}

/**
 * The most specific rule the transaction fits: more conditions beat fewer, and the newest wins a tie.
 * "Aldi + Prepaid-Konto" therefore beats "Aldi", and the person's rules beat the built-in ones.
 */
export function findRule(tx: RuleInput): TransactionRule | null {
  let best: TransactionRule | null = null

  for (const rule of rules) {
    if (matches(rule.match, tx) && (!best || conditionCount(rule.match) >= conditionCount(best.match))) {
      best = rule
    }
  }

  return best
}

// Words that say nothing about what a payment was for
const FILLER = new Set([
  'fuer',
  'ihre',
  'ihren',
  'ihrem',
  'ihrer',
  'einkauf',
  'zahlung',
  'rechnung',
  'payment',
  'purchase',
])

/** The conditions worth offering for a rule made from this transaction: its payee, a few distinctive words, its amount, the other account. */
export function suggestRule(tx: RuleInput): Required<RuleMatch> {
  const words = [
    ...new Set(
      tx.description
        .split(/[^\p{L}\p{N}-]+/u)
        .filter(w => w.length >= 5 && !/\d/.test(w) && !FILLER.has(w.toLowerCase())),
    ),
  ].slice(0, 5)

  return {
    payee: tx.recipient?.trim() ?? '',
    words,
    amount: Math.abs(tx.amount),
    iban: normalizeIban(tx.recipientIban ?? ''),
  }
}
