import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

export interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error'
  actionLabel?: string
  onAction?: () => void
}

interface ToastHostProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.tone === 'error' ? 10000 : 7000)
    return () => clearTimeout(timer)
  }, [toast.id])

  const Icon = toast.tone === 'error' ? AlertTriangle : CheckCircle2
  return (
    <div
      role="status"
      className="flex items-center gap-3 bg-midnight-800 border border-midnight-600 rounded-xl shadow-2xl px-4 py-3 max-w-md animate-[toast-in_150ms_ease-out]"
    >
      <Icon className={`w-5 h-5 shrink-0 ${toast.tone === 'error' ? 'text-orange-400' : 'text-income'}`} />
      <p className="text-sm text-midnight-100 flex-1">{toast.message}</p>
      {toast.actionLabel && toast.onAction && (
        <button
          onClick={() => {
            toast.onAction?.()
            onDismiss()
          }}
          className="text-sm font-medium text-accent hover:underline shrink-0"
        >
          {toast.actionLabel}
        </button>
      )}
      <button onClick={onDismiss} aria-label="Dismiss" className="text-midnight-400 hover:text-white shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}
