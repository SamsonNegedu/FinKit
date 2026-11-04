/**
 * Money is stored in major units (e.g. euros) with at most two decimal places. Arithmetic uses integer cents so
 * totals match what people see in the UI (same approach as `double-booking.ts` and `splits.ts`).
 */

export function moneyMinor(amount: number): number {
  return Math.round(amount * 100)
}

export function fromMoneyMinor(minor: number): number {
  return minor / 100
}

export function roundMoney(amount: number): number {
  return fromMoneyMinor(moneyMinor(amount))
}

export function addMoney(a: number, b: number): number {
  return fromMoneyMinor(moneyMinor(a) + moneyMinor(b))
}

export function subtractMoney(a: number, b: number): number {
  return fromMoneyMinor(moneyMinor(a) - moneyMinor(b))
}

export function sumMoney(amounts: Iterable<number>): number {
  let minor = 0

  for (const amount of amounts) {
    minor += moneyMinor(amount)
  }

  return fromMoneyMinor(minor)
}

export function negateMoney(amount: number): number {
  return fromMoneyMinor(-moneyMinor(amount))
}
