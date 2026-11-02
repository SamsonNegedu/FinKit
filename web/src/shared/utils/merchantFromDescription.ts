// Card and PayPal texts name the merchant after "bei" (German) or "by" (English):
// "Card transaction of 5.50 GBP issued by Cooplands Bakery", "Ihr Einkauf bei Rebtel Networks AB".
// The last marker wins because the text before it can contain one too ("Paid by card, issued by X").
const AFTER_MARKER = /\b(?:bei|by)\s+((?:(?!\b(?:bei|by)\b).)+)$/i

const MAX_LENGTH = 40

export function merchantFromDescription(description: string): string | undefined {
  const name = AFTER_MARKER.exec(description.trim())?.[1]
    // Cards and phone numbers some banks append after the name
    .replace(/\s+\d{4,}.*$/, '')
    .trim()

  return name ? name.slice(0, MAX_LENGTH).trim() : undefined
}

// Klarna texts read "Purchase at Back Market": "at" is too common a word to treat as a marker anywhere else
const KLARNA_PURCHASE = /^purchase at\s+(.+)$/i

/** PayPal and Klarna are only the processor: the shop is named in the text, so that is what a title or rule should use. */
export function shopBehindProcessor(tx: { recipient?: string; description: string }): string | undefined {
  if (!tx.recipient) {
    return undefined
  }
  if (/^paypal\b/i.test(tx.recipient)) {
    return merchantFromDescription(tx.description)
  }
  if (/^klarna\b/i.test(tx.recipient)) {
    return KLARNA_PURCHASE.exec(tx.description.trim())?.[1].trim().slice(0, MAX_LENGTH).trim() || undefined
  }

  return undefined
}
