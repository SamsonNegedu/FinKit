import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react'
import { isFileSupported, getSupportedExtensions } from '../lib/parser'

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>
  isLoading: boolean
  error: string | null
}

export default function FileUpload({ onFileUpload, isLoading, error }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && isFileSupported(file)) {
      onFileUpload(file)
    }
  }, [onFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }, [onFileUpload])

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Analyse Your Transactions
        </h2>
        <p className="text-midnight-300">
          Upload your bank export CSV to get started. All data is anonymized before processing.
        </p>
      </div>

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
          onChange={handleFileSelect}
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
                <p className="text-sm text-midnight-400 mt-1">Anonymizing and categorizing</p>
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
          icon="🔒" 
          title="Privacy First" 
          description="All personal data is anonymized before processing"
        />
        <Feature 
          icon="⚡" 
          title="Smart Categories" 
          description="Auto-categorizes based on merchant patterns"
        />
        <Feature 
          icon="📊" 
          title="Export Ready" 
          description="One-click export to your Google Sheet"
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
