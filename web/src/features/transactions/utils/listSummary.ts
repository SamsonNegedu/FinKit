import type { Transaction } from '@/shared/types'
import { signedTransactionAmount } from '@/shared/utils/transactionAmount'
import { merchantKeyOf, normalizeMerchant } from '@/shared/utils/categorizer'
import { displayNameOf } from '@/shared/utils/aliases'

/** Income minus spending of the rows that count: excluded ones are left out, as in the totals elsewhere. */
export function netOf(rows: Transaction[]): number {
  return rows.reduce((sum, t) => sum + signedTransactionAmount(t), 0)
}

// The payee, not the shop behind it: "from PayPal" is true of every PayPal row whatever it bought
const payee = (t: Transaction) => normalizeMerchant(t.recipient || merchantKeyOf(t))

/** What the shown rows have in common ("All 12 are recurring, from PayPal"), or null when nothing stands out. */
export function commonTraits(rows: Transaction[]): string | null {
  if (rows.length < 2) {
    return null
  }
  const parts: string[] = []

  if (rows.every(t => t.isRecurring)) {
    parts.push('recurring')
  }
  const first = payee(rows[0])

  if (rows.every(t => payee(t) === first)) {
    parts.push(`from ${shortName(rows[0].recipient || displayNameOf(rows[0]))}`)
  }

  return parts.length === 0 ? null : `All ${rows.length} are ${parts.join(', ')}`
}

// Legal forms add length, not meaning: "PayPal Europe S.a.r.l. et Cie S.C.A" reads as "PayPal Europe"
const LEGAL_FORM = /\s+(S\.a\.r\.l|GmbH|AG|Ltd|Inc|B\.V|SE|et Cie)\b.*$/i

function shortName(name: string): string {
  return name.replace(LEGAL_FORM, '').trim() || name
}
