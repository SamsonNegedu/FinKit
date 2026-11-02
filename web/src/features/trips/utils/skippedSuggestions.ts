// Transactions inside a trip's dates that you said were not part of it, so the suggestion stops coming back.
// Kept in this browser: a convenience, nothing to sync.
const key = (tripId: string) => `finkit.trip-skipped.${tripId}`

export function loadSkipped(tripId: string): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key(tripId)) || '[]')

    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveSkipped(tripId: string, refs: Set<string>): void {
  try {
    localStorage.setItem(key(tripId), JSON.stringify([...refs]))
  } catch {
    // the choice just won't persist
  }
}
