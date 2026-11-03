/** Small currency deltas are treated as flat (same as Category by month). */
const FLAT = 1

export function percentChangeArrow(delta: number): string {
  if (delta > 0) {
    return '▲'
  }

  return '▼'
}

export function percentChangeNote(delta: number): string {
  return `${percentChangeArrow(delta)} ${Math.abs(Math.round(delta))}% vs the period before`
}

export function percentChangeTone(delta: number): 'up' | 'down' {
  if (delta > 0) {
    return 'up'
  }

  return 'down'
}

export function currencyDeltaDisplay(
  delta: number | null,
  money: (n: number) => string,
): { text: string; muted: boolean; positive: boolean } {
  if (delta === null || Math.abs(delta) < FLAT) {
    return { text: '–', muted: true, positive: false }
  }

  return {
    text: `${percentChangeArrow(delta)} ${money(Math.abs(delta))}`,
    muted: false,
    positive: delta > 0,
  }
}
