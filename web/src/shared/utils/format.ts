// One place for number formatting so the decimal style can be switched app-wide.
export type NumberFormat = 'point' | 'comma' // 1,234.56  |  1.234,56

const KEY = 'finkit.numberFormat'

function load(): NumberFormat {
  try {
    return localStorage.getItem(KEY) === 'comma' ? 'comma' : 'point'
  } catch {
    return 'point'
  }
}

let current: NumberFormat = load()

export function getNumberFormat(): NumberFormat {
  return current
}

export function setNumberFormat(format: NumberFormat): void {
  current = format
  try {
    localStorage.setItem(KEY, format)
  } catch {
    // preference just won't persist
  }
}

const locale = () => (current === 'point' ? 'en-US' : 'de-DE')

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(locale(), { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

// Plain number for pasting into a sheet (no symbol, no thousands separator)
export function formatForSheet(amount: number): string {
  const fixed = amount.toFixed(2)

  return current === 'point' ? fixed : fixed.replace('.', ',')
}
