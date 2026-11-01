import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Transaction, SheetConfig } from '@/shared/types'
import { useExportPreviewData } from './useExportPreviewData'
import ExportPreviewBody from './ExportPreviewBody'
import { rowToTsv } from './exportPreviewUtils'

interface ExportPreviewProps {
  transactions: Transaction[]
  sheetConfig?: SheetConfig | null
}

export default function ExportPreview({ transactions, sheetConfig }: ExportPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const data = useExportPreviewData(transactions, sheetConfig)

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(data.allRows.map((r, i) => rowToTsv(r, data.yearMonths[i].label)).join('\n'))
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rowToTsv(data.previewData, data.month))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="card">
      <div>
        <ExportPreviewBody
          month={data.month}
          sheetTabName={data.sheetTabName}
          years={data.years}
          yearMonths={data.yearMonths}
          activeYear={data.activeYear}
          activeMonthKey={data.activeMonth?.key}
          previewData={data.previewData}
          onYearChange={year => {
            data.setSelectedYear(year)
            data.setSelectedKey(null)
          }}
          onMonthSelect={data.setSelectedKey}
        />

        <div className="bg-midnight-800 rounded-lg p-4 mt-6">
          <p className="text-sm text-midnight-300">
            <strong>How to use:</strong> Pick a month, click "Copy Row" (or "Copy all rows" when the file spans several
            months), then paste into your Google Sheet in the row for <span className="text-white">{data.month}</span>.
            The data is tab-separated and will fill the columns in the same order as your sheet. Columns the app doesn't
            know about are pasted empty.
          </p>
        </div>

        {copied && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg mt-4">
            <Check className="w-5 h-5 text-green-400" />
            <p className="text-green-400 font-medium">Copied to clipboard! Paste into your Google Sheet.</p>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-3 pt-6 mt-6 border-t border-midnight-700">
          <p className="text-xs text-midnight-500">Tip: Select cell A in your target row before pasting</p>
          <div className="flex gap-3">
            {data.yearMonths.length > 1 && (
              <button onClick={handleCopyAll} className="btn-secondary flex items-center gap-2">
                {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedAll ? 'Copied!' : `Copy all ${data.yearMonths.length} rows of ${data.activeYear}`}
              </button>
            )}
            <button onClick={handleCopy} className="btn-primary flex items-center gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy this row
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
