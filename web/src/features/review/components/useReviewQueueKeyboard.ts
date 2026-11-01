import { useEffect } from 'react'

export function useReviewQueueKeyboard(
  quickPicks: string[],
  assign: (category: string) => void,
  skip: () => void,
  exclude: () => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null

      if (
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      ) {
        return
      }
      if (document.querySelector('[aria-modal="true"]')) {
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        const category = quickPicks[Number(e.key) - 1]

        if (category) {
          assign(category)
        }
      } else if (e.key === 's') {
        skip()
      } else if (e.key === 'e') {
        exclude()
      }
    }
    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  })
}
