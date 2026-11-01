import { useMemo, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Transaction, SheetConfig, DateRange } from '../types'
import { buildSheetRow, getLayout } from '../lib/sheetLayout'
import { formatCurrency, formatForSheet } from '../lib/format'

interface ExportPreviewProps {
  transactions: Transaction[]
  sheetConfig?: SheetConfig | null
  dateRange: DateRange | null
  onCancel: () => void
}

// Format for Google Sheets (just the number, no currency symbol)

export default function ExportPreview({
  transactions,
  sheetConfig,
  onCancel,
}: ExportPreviewProps) {
  const [copied, setCopied] = useState(false)

  // One row per calendar month present in the data (a 3-month file gives 3 rows)
  const months = useMemo(() => {
    const byMonth = new Map<string, { label: string; txs: Transaction[] }>()
    for (const tx of transactions) {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = byMonth.get(key) ?? {
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        txs: [],
      }
      entry.txs.push(tx)
      byMonth.set(key, entry)
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ key, ...v }))
  }, [transactions])

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const activeMonth = months.find(m => m.key === selectedKey) ?? months[months.length - 1]
  const month = activeMonth?.label ?? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // The row mirrors the sheet's own column order (read from its header row)
  const layout = getLayout(sheetConfig)
  const previewData = useMemo(
    () => buildSheetRow(activeMonth?.txs ?? [], layout, month),
    [activeMonth, layout, month]
  )
  const allRows = useMemo(
    () => months.map(m => buildSheetRow(m.txs, layout, m.label)),
    [months, layout]
  )

  const rowToTsv = (row: ReturnType<typeof buildSheetRow>, label: string) =>
    row.cells
      .map(c => (c.kind === 'month' ? label : c.value === null ? '' : formatForSheet(c.value)))
      .join('\t')

  const [copiedAll, setCopiedAll] = useState(false)
  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(allRows.map((r, i) => rowToTsv(r, months[i].label)).join('\n'))
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rowToTsv(previewData, month))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const cellStyle = (kind: string, value: number | null): string => {
    if (kind === 'month') return 'bg-midnight-800 text-white'
    if (value === null) return 'bg-midnight-900 text-midnight-600'
    switch (kind) {
      case 'total': return 'bg-expense/20 text-expense'
      case 'income': return 'bg-income/20 text-income'
      case 'incomeAfter':
      case 'net': return value >= 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
      case 'savings': return 'bg-blue-500/20 text-blue-400'
      case 'investment': return 'bg-cyan-500/20 text-cyan-400'
      default: return value > 0 ? 'bg-midnight-800 text-white' : 'bg-midnight-800/50 text-midnight-500'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-midnight-900 border border-midnight-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-midnight-700">
          <h2 className="text-xl font-semibold text-white">Export Preview</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-midnight-800 rounded-lg transition-colors"
            disabled={status === 'loading'}
          >
            <X className="w-5 h-5 text-midnight-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Target Info */}
          <div className="bg-midnight-800 rounded-lg p-4">
            <p className="text-sm text-midnight-400">Data for</p>
            <p className="text-white font-medium">{month}{sheetConfig?.tabName ? ` → ${sheetConfig.tabName}` : ''}</p>
          </div>

          {months.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Month">
              {months.map(m => (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={m.key === activeMonth?.key}
                  onClick={() => setSelectedKey(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    m.key === activeMonth?.key ? 'bg-accent text-white' : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Sheet Row Preview - Matching exact format */}
          <div>
            <h3 className="text-sm font-medium text-midnight-300 mb-3">Sheet Row Preview</h3>
            <div className="bg-midnight-950 rounded-lg p-4 overflow-x-auto">
              <div className="inline-flex gap-1 min-w-max">
                {previewData.cells.map(cell => (
                  <div key={cell.column} className="flex flex-col items-center">
                    <span className="text-xs text-midnight-500 mb-1">{cell.column}</span>
                    <div
                      className={`px-3 py-2 rounded text-sm whitespace-nowrap ${cellStyle(cell.kind, cell.value)}`}
                      title={cell.label}
                    >
                      {cell.kind === 'month' ? month : cell.value === null ? '—' : formatCurrency(cell.value)}
                    </div>
                    <span className="text-[10px] text-midnight-500 mt-1 max-w-[88px] truncate" title={cell.label}>
                      {cell.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-midnight-500 mt-2">
              Columns follow your sheet, left to right. Scroll to see all → €0.00 is dimmed, — is a column left untouched
            </p>
          </div>

          {/* Category Breakdown */}
          <div>
            <h3 className="text-sm font-medium text-midnight-300 mb-3">Category Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {previewData.cells
                .filter(c => c.kind === 'category' && (c.value ?? 0) > 0)
                .map(({ column, label, value }) => (
                  <div key={column} className="flex items-center justify-between bg-midnight-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-midnight-500">{column}</span>
                      <span className="text-sm text-white truncate">{label}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{formatCurrency(value ?? 0)}</span>
                  </div>
                ))}
            </div>
          </div>

          {previewData.unmapped.length > 0 && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-sm text-orange-400 font-medium">Not in your sheet (left out of the row)</p>
              <p className="text-xs text-orange-400/80 mt-1">
                {previewData.unmapped.map(u => `${u.category} ${formatCurrency(u.total)}`).join(' · ')}
              </p>
              <p className="text-xs text-midnight-400 mt-1">
                Add a column for these in your sheet and sync in Settings, or recategorize them.
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-midnight-700">
            <div className="text-center">
              <p className="text-xs text-midnight-400">Total Expenditure</p>
              <p className="text-lg font-semibold text-expense">{formatCurrency(previewData.totalExpenditure)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-midnight-400">Income</p>
              <p className="text-lg font-semibold text-income">{formatCurrency(previewData.income)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-midnight-400">Savings + Investment</p>
              <p className="text-lg font-semibold text-blue-400">
                {formatCurrency(previewData.grossSavings + previewData.grossInvestment)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-midnight-400">Net Income</p>
              <p className={`text-lg font-semibold ${previewData.netIncome >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(previewData.netIncome)}
              </p>
            </div>
          </div>

          {/* Copy Instructions */}
          <div className="bg-midnight-800 rounded-lg p-4">
            <p className="text-sm text-midnight-300">
              <strong>How to use:</strong> Pick a month, click "Copy Row" (or "Copy all rows" when the file spans several months), then paste into your Google Sheet
              in the row for <span className="text-white">{month}</span>. The data is tab-separated and will
              fill the columns in the same order as your sheet. Columns the app doesn't know about are pasted empty.
            </p>
          </div>

          {/* Copy Success Message */}
          {copied && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-5 h-5 text-green-400" />
              <p className="text-green-400 font-medium">Copied to clipboard! Paste into your Google Sheet.</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 p-6 border-t border-midnight-700">
          <p className="text-xs text-midnight-500">
            Tip: Select cell A in your target row before pasting
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary"
            >
              Close
            </button>
            {months.length > 1 && (
              <button onClick={handleCopyAll} className="btn-secondary flex items-center gap-2">
                {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedAll ? 'Copied!' : `Copy all ${months.length} rows`}
              </button>
            )}
            <button
              onClick={handleCopy}
              className="btn-primary flex items-center gap-2"
            >
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
