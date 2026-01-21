import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, Loader2, Calendar } from 'lucide-react'
import { isFileSupported, getSupportedExtensions } from '../lib/parser'

export interface ImportOptions {
  dateFilter: 'all' | '1m' | '3m' | '6m' | '1y' | 'custom'
  customStartDate?: Date
  customEndDate?: Date
}

interface FileUploadProps {
  onFileUpload: (file: File, options: ImportOptions) => Promise<void>
  isLoading: boolean
  error: string | null
}

const DATE_FILTER_OPTIONS = [
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
] as const

export default function FileUpload({ onFileUpload, isLoading, error }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [dateFilter, setDateFilter] = useState<ImportOptions['dateFilter']>('3m')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = (file: File) => {
    if (isFileSupported(file)) {
      setPendingFile(file)
      setShowOptions(true)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [])

  const handleConfirmImport = () => {
    if (!pendingFile) return

    const options: ImportOptions = { dateFilter }

    // Calculate date range based on filter
    if (dateFilter !== 'all' && dateFilter !== 'custom') {
      const now = new Date()
      const months = dateFilter === '1m' ? 1 : dateFilter === '3m' ? 3 : dateFilter === '6m' ? 6 : 12
      options.customStartDate = new Date(now.getFullYear(), now.getMonth() - months, 1)
      options.customEndDate = now
    }

    setShowOptions(false)
    onFileUpload(pendingFile, options)
    setPendingFile(null)
  }

  const handleCancel = () => {
    setShowOptions(false)
    setPendingFile(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Analyse Your Transactions
        </h2>
        <p className="text-midnight-300">
          Upload your bank export. Large files? No problem - filter by date on import.
        </p>
      </div>

      {/* Import Options Modal */}
      {showOptions && pendingFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-midnight-900 border border-midnight-700 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-2">Import Options</h3>
            <p className="text-midnight-400 text-sm mb-6">
              Filter transactions to import only what you need
            </p>

            {/* File Info */}
            <div className="bg-midnight-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-accent" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{pendingFile.name}</p>
                  <p className="text-midnight-400 text-sm">
                    {(pendingFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>

            {/* Date Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-midnight-300 mb-3">
                <Calendar className="w-4 h-4 inline mr-2" />
                Import transactions from
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DATE_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateFilter(option.value)}
                    className={`
                      px-4 py-3 rounded-lg text-sm font-medium transition-all
                      ${dateFilter === option.value
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

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 btn-primary"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
          ${isDragging
            ? 'border-accent bg-accent/10 scale-[1.02]'
            : 'border-midnight-600 hover:border-midnight-500 bg-midnight-900/50'
          }
          ${isLoading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept={getSupportedExtensions()}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <>
              <div className="w-16 h-16 rounded-full bg-midnight-800 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
              <div>
                <p className="text-lg font-medium text-white">Processing transactions...</p>
                <p className="text-sm text-midnight-400 mt-1">Filtering and categorizing</p>
              </div>
            </>
          ) : (
            <>
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? 'bg-accent/20' : 'bg-midnight-800'}
              `}>
                {isDragging ? (
                  <FileSpreadsheet className="w-8 h-8 text-accent" />
                ) : (
                  <Upload className="w-8 h-8 text-midnight-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-medium text-white">
                  {isDragging ? 'Drop your file here' : 'Drop your file here or click to browse'}
                </p>
                <p className="text-sm text-midnight-400 mt-1">
                  CSV, Excel (.xlsx), and OFX formats supported
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Failed to parse file</p>
            <p className="text-red-400/70 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-3 gap-4">
        <Feature
          icon="📅"
          title="Date Filtering"
          description="Import only the months you need"
        />
        <Feature
          icon="⚡"
          title="Smart Categories"
          description="Auto-categorizes based on merchant patterns"
        />
        <Feature
          icon="📊"
          title="Visual Analytics"
          description="Charts, trends, and spending breakdowns"
        />
      </div>
    </div>
  )
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 bg-midnight-900/50 rounded-xl border border-midnight-800">
      <span className="text-2xl">{icon}</span>
      <h3 className="font-medium text-white mt-2">{title}</h3>
      <p className="text-sm text-midnight-400 mt-1">{description}</p>
    </div>
  )
}
