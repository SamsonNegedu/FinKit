import { useState } from 'react'
import { loadDismissed, saveDismissed } from '@/shared/utils/dismissedInsights'

/** The notes waved away so far, and a way to wave one away. Both pages share the choice through the browser's storage. */
export function useDismissedInsights() {
  const [dismissed, setDismissed] = useState(loadDismissed)

  const dismiss = (id: string) => {
    const next = new Set(dismissed).add(id)

    saveDismissed(next)
    setDismissed(next)
  }

  return { dismissed, dismiss }
}
