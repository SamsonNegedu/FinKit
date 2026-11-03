import Tooltip from '@/shared/components/Tooltip'
import { useState } from 'react'

/** A line of your own under a transaction: what it was for. Click it to change it; empty removes it. */
export default function TransactionNote({
  note,
  open,
  onOpen,
  onClose,
  onSave,
}: {
  note: string | undefined
  /** True while it is being edited (the row's "add note" button opens it too) */
  open: boolean
  onOpen: () => void
  onClose: () => void
  onSave: (note: string | undefined) => void
}) {
  const [draft, setDraft] = useState(note ?? '')

  const finish = (save: boolean) => {
    if (save) {
      onSave(draft.trim() || undefined)
    }
    onClose()
  }

  if (open) {
    return (
      <input
        autoFocus
        // The ring draws inside: the row clips whatever sticks out of it
        className="input mt-1 w-full py-1 text-xs focus:ring-inset"
        aria-label="Note"
        placeholder="What was this for?"
        maxLength={200}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            finish(true)
          } else if (e.key === 'Escape') {
            finish(false)
          }
        }}
      />
    )
  }
  if (!note) {
    return null
  }

  return (
    <Tooltip label={`${note} (click to edit)`}>
      <button
        aria-label={`${note} (click to edit)`}
        onClick={() => {
          setDraft(note)
          onOpen()
        }}
        className="mt-0.5 block max-w-full truncate text-left text-xs italic text-warning/80 hover:text-warning"
      >
        {note}
      </button>
    </Tooltip>
  )
}
