/** Convert an amount in `from` to the base currency using stored rates, or null when there is no rate. */
export function amountInBase(amount: number, from: string, base: string, rates: Record<string, number>): number | null {
  if (from === base) {
    return amount
  }
  if (rates[from] > 0) {
    return amount * rates[from]
  }

  return null
}

/** Monthly recurring cost in base currency (contracts, overview tiles). */
export function monthlyInBase(
  monthly: number,
  from: string,
  base: string,
  rates: Record<string, number>,
): number | null {
  return amountInBase(monthly, from, base, rates)
}
