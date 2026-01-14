import { useState } from 'react'
import { Copy, Settings } from 'lucide-react'
import { Transaction, SheetConfig, DateRange } from '../types'
import ExportPreview from './ExportPreview'

interface ExportButtonProps {
  transactions: Transaction[]
  sheetConfig: SheetConfig | null
  dateRange: DateRange | null
  onOpenSettings: () => void
}

export default function ExportButton({
  transactions,
  sheetConfig,
  dateRange,
  onOpenSettings,
}: ExportButtonProps) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <button
        onClick={onOpenSettings}
        className="btn-secondary text-sm flex items-center gap-2"
        title="Export Settings"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Settings</span>
      </button>

      <button
        onClick={() => setShowPreview(true)}
        className="btn-primary flex items-center gap-2"
        title="Export data for Google Sheets"
      >
        <Copy className="w-4 h-4" />
        Export
      </button>

      {showPreview && (
        <ExportPreview
          transactions={transactions}
          sheetConfig={sheetConfig}
          dateRange={dateRange}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
