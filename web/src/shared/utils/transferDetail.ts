import type { Transaction } from '@/shared/types'

const tail = (iban: string) => `…${iban.replace(/\s+/g, '').slice(-4)}`

/**
 * Which two accounts a transfer between your own accounts joined, as a short line: "To …1234 · from …5678".
 * Only the last four characters are shown, the way connected accounts are labelled, so a screenshot of the list
 * doesn't give away a whole IBAN. Returns undefined when the row carries neither end.
 */
export function transferDetail(tx: Transaction): string | undefined {
  if (tx.category !== 'Transfer') {
    return undefined
  }

  const other = tx.recipientIban ? tail(tx.recipientIban) : tx.recipient || undefined
  const own = tx.accountLabel || (tx.referenceAccount ? tail(tx.referenceAccount) : undefined)

  if (!other && !own) {
    return undefined
  }

  const out = tx.type === 'expense'
  const parts = [other && `${out ? 'To' : 'From'} ${other}`, own && `${out ? 'from' : 'into'} ${own}`].filter(
    Boolean,
  ) as string[]

  return parts.join(' · ').replace(/^./, c => c.toUpperCase())
}
