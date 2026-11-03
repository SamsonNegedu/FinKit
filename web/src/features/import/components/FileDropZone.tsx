import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react'
import { isFileSupported, getSupportedExtensions } from '@/shared/utils/parser'

interface FileDropZoneProps {
  isLoading: boolean
  onFileSelect: (file: File) => void
}

export default function FileDropZone({ isLoading, onFileSelect }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]

      if (file && isFileSupported(file)) {
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]

      if (file && isFileSupported(file)) {
        onFileSelect(file)
      }
      e.target.value = ''
    },
    [onFileSelect],
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
          ${
            isDragging
              ? 'border-accent bg-accent/10 scale-[1.02]'
              : 'border-line-strong hover:border-midnight-500 bg-surface/50'
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
              <p className="text-lg font-medium text-ink">Processing transactions...</p>
              <p className="text-sm text-midnight-400 mt-1">Filtering and categorizing</p>
            </div>
          </>
        ) : (
          <>
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? 'bg-accent/20' : 'bg-midnight-800'}
              `}
            >
              {isDragging ? (
                <FileSpreadsheet className="w-8 h-8 text-accent" />
              ) : (
                <Upload className="w-8 h-8 text-midnight-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium text-ink">
                {isDragging ? 'Drop your file here' : 'Drop your file here or click to browse'}
              </p>
              <p className="text-sm text-midnight-400 mt-1">CSV, Excel (.xlsx), and OFX formats supported</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
