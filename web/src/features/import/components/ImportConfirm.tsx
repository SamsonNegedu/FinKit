import Modal from '@/shared/components/forms/Modal'

interface ImportConfirmProps {
  fileName: string
  total: number
  duplicates: number
  onSkip: () => void
  onKeepAll: () => void
  onCancel: () => void
}

// Shown when an added file contains rows that are already loaded
export default function ImportConfirm({
  fileName,
  total,
  duplicates,
  onSkip,
  onKeepAll,
  onCancel,
}: ImportConfirmProps) {
  return (
    <Modal title="Some rows are already loaded" onClose={onCancel}>
      <p className="text-sm text-midnight-300 mt-2">
        <span className="text-white">{duplicates}</span> of the {total} rows in{' '}
        <span className="text-white">{fileName}</span> match transactions you already have (same date, amount and
        description).
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button className="btn-primary" onClick={onSkip} autoFocus>
          Skip the {duplicates} duplicate{duplicates === 1 ? '' : 's'} (recommended)
        </button>
        <button className="btn-secondary" onClick={onKeepAll}>
          Import everything anyway
        </button>
        <button className="text-sm text-midnight-400 hover:text-white py-2" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
