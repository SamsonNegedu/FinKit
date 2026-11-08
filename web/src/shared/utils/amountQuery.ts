import { moneyMinor } from '@/shared/utils/money'

/**
 * Reads a search box entry as an amount: "12", "12.50", "12,50", "€12.50", "-12.5".
 * Returns null when it isn't one, so the text search still handles things like "7-Eleven".
 * The sign is ignored: a row's amount is stored unsigned and its type says the direction.
 */
function parseAmountQuery(q: string): { minor: number; wholeOnly: boolean } | null {
  const cleaned = q.trim().replace(/^[-+]?\s*[^\d\s.,-]?\s*/, '')

  if (!/^\d+([.,]\d{1,2})?$/.test(cleaned)) {
    return null
  }

  const value = Number(cleaned.replace(',', '.'))

  return { minor: moneyMinor(value), wholeOnly: !/[.,]/.test(cleaned) }
}

/** A whole number ("12") matches 12.00 to 12.99; a decimal ("12.50") matches that amount exactly. */
export function matchesAmountQuery(amount: number, q: string): boolean {
  const parsed = parseAmountQuery(q)

  if (!parsed) {
    return false
  }

  const minor = moneyMinor(Math.abs(amount))

  return parsed.wholeOnly ? Math.floor(minor / 100) * 100 === parsed.minor : minor === parsed.minor
}
