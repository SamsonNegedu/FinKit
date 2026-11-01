import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { createSampleFile } from '@/shared/utils/sample'
import DashboardSkeleton from '@/shared/components/feedback/Skeleton'
import BankConnectSection from './BankConnectSection'
import ImportOptionsModal from './ImportOptionsModal'
import FileDropZone from './FileDropZone'
import type { ImportOptions } from './fileUpload.types'
import { buildImportOptions } from './fileUpload.types'
import { useFileUploadUi } from './useFileUploadUi'

export type { ImportOptions } from './fileUpload.types'

interface FileUploadProps {
  onFileUpload: (file: File, options: ImportOptions) => Promise<void>
  isLoading: boolean
  error: string | null
  bankingEnabled?: boolean
  onConnectBank?: (bank: string | null) => void
}

export default function FileUpload({ onFileUpload, isLoading, error, bankingEnabled, onConnectBank }: FileUploadProps) {
  const { phase, dispatch, showOptionsModal, showFileDropZone, optionsFile, dateFilter } =
    useFileUploadUi(!!bankingEnabled)

  useEffect(() => {
    dispatch({ type: 'RESET', bankingEnabled: !!bankingEnabled })
  }, [bankingEnabled, dispatch])

  const handleFileSelect = (file: File) => {
    dispatch({ type: 'FILE_SELECTED', file })
  }

  const handleConfirmImport = () => {
    if (phase.kind !== 'options') {
      return
    }
    dispatch({ type: 'CONFIRM_OPTIONS' })
    onFileUpload(phase.file, buildImportOptions(phase.dateFilter))
  }

  const handleCancel = () => {
    dispatch({ type: 'CANCEL_OPTIONS' })
  }

  const revealFileDrop = phase.kind === 'pick' && phase.revealFileDrop

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">
          {bankingEnabled ? 'Bring in your transactions' : 'Add transactions'}
        </h2>
        <p className="text-midnight-400 text-sm">
          {bankingEnabled
            ? 'Connect a bank to sync automatically. No exports.'
            : 'Drop a bank export. You can filter by date as you import.'}
        </p>
      </div>

      {bankingEnabled && (
        <BankConnectSection
          showFile={revealFileDrop}
          onConnectBank={onConnectBank}
          onToggleFileImport={() => dispatch({ type: 'TOGGLE_FILE_DROP' })}
        />
      )}

      {showOptionsModal() && optionsFile && (
        <ImportOptionsModal
          pendingFile={optionsFile}
          dateFilter={dateFilter}
          onDateFilterChange={value => dispatch({ type: 'SET_DATE_FILTER', dateFilter: value })}
          onConfirm={handleConfirmImport}
          onCancel={handleCancel}
        />
      )}

      {showFileDropZone() && <FileDropZone isLoading={isLoading} onFileSelect={handleFileSelect} />}

      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Failed to parse file</p>
            <p className="text-red-400/70 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="mt-6 text-center">
          <p className="text-xs text-midnight-500">No export handy?</p>
          <button
            onClick={() => onFileUpload(createSampleFile(), { dateFilter: 'all' })}
            className="mt-2 text-sm text-midnight-300 hover:text-white underline underline-offset-2"
          >
            Try with sample data
          </button>
        </div>
      )}

      {isLoading && (
        <div className="mt-8">
          <DashboardSkeleton />
        </div>
      )}
    </div>
  )
}
