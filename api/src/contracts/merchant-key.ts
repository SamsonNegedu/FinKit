import { referenceTokens, withoutReferences } from './merchant-references'

// Mirrors web/src/shared/utils/merchantFromDescription.ts and merchantKeyOf in
// web/src/shared/utils/categorizer/learnedMappings.ts, so a contract is named and grouped the way the
// transaction list names its merchant. The two copies must match: change one, change the other.
const AFTER_MARKER = /\b(?:bei|by)\s+((?:(?!\b(?:bei|by)\b).)+)$/i
const MAX_LENGTH = 40
const BANK_PREFIXES =
  /^(kartenzahlung|kartenumsatz|girocard|debitkarte|lastschrift|basislastschrift|sepa|visa|ec)\b[\s:/-]*/i

function merchantFromDescription(description: string): string | undefined {
  const name = AFTER_MARKER.exec(description.trim())?.[1]
    .replace(/\s+\d{4,}.*$/, '')
    .trim()

  return name ? name.slice(0, MAX_LENGTH).trim() : undefined
}

function descriptionKey(description: string): string {
  const named = merchantFromDescription(description)

  if (named) {
    return named
  }
  const cleaned = description
    .replace(BANK_PREFIXES, '')
    .replace(/\b\d{1,2}[./]\d{1,2}([./]\d{2,4})?\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (cleaned || description).slice(0, 30).trim()
}

const KLARNA_PURCHASE = /^purchase at\s+(.+)$/i

function shopBehindProcessor(tx: { recipient?: string; description: string }): string | undefined {
  if (tx.recipient && /^paypal\b/i.test(tx.recipient)) {
    return merchantFromDescription(tx.description)
  }
  if (tx.recipient && /^klarna\b/i.test(tx.recipient)) {
    return KLARNA_PURCHASE.exec(tx.description.trim())?.[1].trim().slice(0, MAX_LENGTH).trim() || undefined
  }

  return undefined
}

/** The merchant's name as shown to people. */
export function merchantName(
  tx: { recipient?: string; description: string },
  references: ReadonlySet<string> = new Set(),
): string {
  return (
    shopBehindProcessor(tx) ||
    (tx.recipient
      ? withoutReferences(tx.recipient, references)
      : descriptionKey(withoutReferences(tx.description, references)))
  )
}

/** What the transactions show to be references: tokens with a digit that occur in only one of them. */
export function referencesOf(txs: Array<{ recipient?: string; description: string }>): Set<string> {
  return referenceTokens(txs.map(tx => `${tx.recipient ?? ''} ${tx.description}`))
}

/** Same normalizer as merchant-rules and the web app. They MUST match. */
export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
