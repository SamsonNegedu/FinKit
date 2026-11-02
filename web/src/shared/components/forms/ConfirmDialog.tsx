import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface Props {
  title: string
  description: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Asks before something that can't be quietly undone. Replaces the browser's confirm box. */
export default function ConfirmDialog({ title, description, confirmLabel, busy, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog.Root open onOpenChange={open => !open && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[70] bg-black/60" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-midnight-700 bg-midnight-900 p-6 shadow-2xl outline-none">
          <AlertDialog.Title className="text-lg font-semibold text-white">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-midnight-300">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel className="btn-secondary">Cancel</AlertDialog.Cancel>
            <button className="btn-primary disabled:opacity-50" disabled={busy} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
