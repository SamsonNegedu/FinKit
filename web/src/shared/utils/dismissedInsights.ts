// Which "what stands out" notes you have waved away. Kept in this browser only: a convenience, nothing to sync.
const KEY = 'finkit.dismissed-insights'

export function loadDismissed(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')

    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids].slice(-200)))
  } catch {
    // the choice just won't persist
  }
}
