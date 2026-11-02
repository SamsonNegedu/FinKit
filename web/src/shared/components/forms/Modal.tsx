import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  /** Tailwind max-width class for the panel */
  width?: string
}

/** The app's dialog: Radix Dialog gives focus trapping, Escape to close and a labelled title. */
export default function Modal({ title, onClose, children, width = 'max-w-md' }: Props) {
  return (
    <Dialog.Root open onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-[70] max-h-[90vh] w-[calc(100%-2rem)] ${width} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-midnight-700 bg-midnight-900 p-6 shadow-2xl outline-none`}
        >
          <Dialog.Title className="mb-1 text-lg font-semibold text-white">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
