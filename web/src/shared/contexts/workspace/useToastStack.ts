import { useCallback, useRef, useState } from 'react'
import type { ToastItem } from '@/shared/components/feedback/Toast'

export function useToastStack() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = ++toastId.current

    setToasts(prev => {
      const kept = toast.actionLabel === 'Undo' ? prev.filter(t => t.actionLabel !== 'Undo') : prev

      return [...kept.slice(-2), { ...toast, id }]
    })
  }, [])

  return { toasts, dismissToast, pushToast }
}
