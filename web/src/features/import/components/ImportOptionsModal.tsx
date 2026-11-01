import { Calendar, FileSpreadsheet } from 'lucide-react'
import type { ImportOptions } from './fileUpload.types'
import { DATE_FILTER_OPTIONS } from './fileUpload.types'

interface ImportOptionsModalProps {
  pendingFile: File
  dateFilter: ImportOptions['dateFilter']
  onDateFilterChange: (value: ImportOptions['dateFilter']) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function ImportOptionsModal({
  pendingFile,
  dateFilter,
  onDateFilterChange,
  onConfirm,
  onCancel,
}: ImportOptionsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-midnight-900 border border-midnight-700 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-white mb-2">Import Options</h3>
        <p className="text-midnight-400 text-sm mb-6">Filter transactions to import only what you need</p>

        <div className="bg-midnight-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-accent" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{pendingFile.name}</p>
              <p className="text-midnight-400 text-sm">{(pendingFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-midnight-300 mb-3">
            <Calendar className="w-4 h-4 inline mr-2" />
            Import transactions from
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DATE_FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => onDateFilterChange(option.value)}
                className={`
                      px-4 py-3 rounded-lg text-sm font-medium transition-all
                      ${
                        dateFilter === option.value
                          ? 'bg-accent text-white'
                          : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
                      }
                    `}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-midnight-500 mt-3">
            💡 Tip: For monthly analysis, "Last Month" is usually sufficient
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 btn-primary">
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
