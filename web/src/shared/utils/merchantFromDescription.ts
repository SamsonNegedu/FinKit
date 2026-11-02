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

/** PayPal is only the processor: the shop is named in the text, so that is what a title or rule should use. */
export function shopBehindPayPal(tx: { recipient?: string; description: string }): string | undefined {
  return tx.recipient && /^paypal\b/i.test(tx.recipient) ? merchantFromDescription(tx.description) : undefined
}
