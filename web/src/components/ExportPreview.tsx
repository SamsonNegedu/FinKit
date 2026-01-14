import { useMemo, useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Transaction, SheetConfig, DateRange } from '../types'
import { EXPENSE_CATEGORIES, SHEET_COLUMNS } from '../lib/categorizer'

interface ExportPreviewProps {
  transactions: Transaction[]
  sheetConfig?: SheetConfig | null
  dateRange: DateRange | null
  onCancel: () => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Format for Google Sheets (just the number, no currency symbol)
function formatForSheet(amount: number): string {
  return amount.toFixed(2).replace('.', ',') // German decimal format
}

export default function ExportPreview({
  transactions,
  sheetConfig,
  dateRange,
  onCancel,
}: ExportPreviewProps) {
  const [copied, setCopied] = useState(false)

  const previewData = useMemo(() => {
    // Calculate totals by category
    const categoryTotals = new Map<string, number>()
    let totalIncome = 0
    let grossSavings = 0
    let grossInvestment = 0

    for (const tx of transactions) {
      if (tx.isExcluded) continue

      if (tx.type === 'income') {
        totalIncome += tx.amount
      } else {
        const category = tx.category || 'Other'

        // Check for savings/investment categories
        if (category === 'Savings') {
          grossSavings += tx.amount
        } else if (category === 'Investment') {
          grossInvestment += tx.amount
        } else if (category !== 'Transfer') {
          categoryTotals.set(category, (categoryTotals.get(category) || 0) + tx.amount)
        }
      }
    }

    // Build row data matching exact sheet structure
    const rowData: Array<{ column: string; label: string; value: number; isFormula: boolean }> = []

    // Add all expense categories in order (B-R)
    for (const category of EXPENSE_CATEGORIES) {
      const column = SHEET_COLUMNS[category]
      if (column) {
        rowData.push({
          column,
          label: category,
          value: categoryTotals.get(category) || 0,
          isFormula: false,
        })
      }
    }

    // Calculate total expenditure (sum of B-R)
    const totalExpenditure = Array.from(categoryTotals.values()).reduce((sum, v) => sum + v, 0)

    // Add calculated columns
    const incomeAfterExpenditure = totalIncome - totalExpenditure

    return {
      categories: rowData,
      totalExpenditure,
      income: totalIncome,
      incomeAfterExpenditure,
      grossSavings,
      grossInvestment,
      netIncome: incomeAfterExpenditure - grossSavings - grossInvestment,
    }
  }, [transactions])

  // Format month like "July 2025"
  const month = dateRange
    ? new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Generate tab-separated row for copying to Google Sheets
  const generateCopyableRow = () => {
    const values = [
      month, // A: Month
      ...previewData.categories.map(c => formatForSheet(c.value)), // B-R: Categories
      formatForSheet(previewData.totalExpenditure), // S: Total Expenditure
      formatForSheet(previewData.income), // T: Income
      formatForSheet(previewData.incomeAfterExpenditure), // U: Income After Expenditure
      formatForSheet(previewData.grossSavings), // V: Gross Savings
      formatForSheet(previewData.grossInvestment), // W: Gross Investment
      formatForSheet(previewData.netIncome), // X: Net Income
    ]
    return values.join('\t')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCopyableRow())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
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

          {/* Sheet Row Preview - Matching exact format */}
          <div>
            <h3 className="text-sm font-medium text-midnight-300 mb-3">Sheet Row Preview</h3>
            <div className="bg-midnight-950 rounded-lg p-4 overflow-x-auto">
              <div className="inline-flex gap-1 min-w-max">
                {/* Month Column */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-midnight-500 mb-1">A</span>
                  <div className="bg-midnight-800 px-3 py-2 rounded text-sm text-white whitespace-nowrap">
                    {month}
                  </div>
                </div>

                {/* Category Columns (B-R) */}
                {previewData.categories.map(({ column, label, value }) => (
                  <div key={column} className="flex flex-col items-center">
                    <span className="text-xs text-midnight-500 mb-1">{column}</span>
                    <div
                      className={`px-3 py-2 rounded text-sm whitespace-nowrap ${value > 0 ? 'bg-midnight-800 text-white' : 'bg-midnight-800/50 text-midnight-500'
                        }`}
                      title={label}
                    >
                      {formatCurrency(value)}
                    </div>
                  </div>
                ))}

                {/* Calculated Columns */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-midnight-500 mb-1">S</span>
                  <div className="bg-expense/20 px-3 py-2 rounded text-sm text-expense whitespace-nowrap" title="Total Expenditure">
                    {formatCurrency(previewData.totalExpenditure)}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs text-midnight-500 mb-1">T</span>
                  <div className="bg-income/20 px-3 py-2 rounded text-sm text-income whitespace-nowrap" title="Income">
                    {formatCurrency(previewData.income)}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs text-midnight-500 mb-1">U</span>
                  <div className={`px-3 py-2 rounded text-sm whitespace-nowrap ${previewData.incomeAfterExpenditure >= 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
                    }`} title="Income After Expenditure">
                    {formatCurrency(previewData.incomeAfterExpenditure)}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs text-midnight-500 mb-1">V</span>
                  <div className="bg-blue-500/20 px-3 py-2 rounded text-sm text-blue-400 whitespace-nowrap" title="Gross Savings">
                    {formatCurrency(previewData.grossSavings)}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs text-midnight-500 mb-1">W</span>
                  <div className="bg-cyan-500/20 px-3 py-2 rounded text-sm text-cyan-400 whitespace-nowrap" title="Gross Investment">
                    {formatCurrency(previewData.grossInvestment)}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs text-midnight-500 mb-1">X</span>
                  <div className={`px-3 py-2 rounded text-sm whitespace-nowrap ${previewData.netIncome >= 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
                    }`} title="Net Income">
                    {formatCurrency(previewData.netIncome)}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-midnight-500 mt-2">
              Scroll horizontally to see all columns → Categories with €0.00 are dimmed
            </p>
          </div>

          {/* Category Breakdown */}
          <div>
            <h3 className="text-sm font-medium text-midnight-300 mb-3">Category Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {previewData.categories
                .filter(c => c.value > 0)
                .sort((a, b) => b.value - a.value)
                .map(({ column, label, value }) => (
                  <div key={column} className="flex items-center justify-between bg-midnight-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-midnight-500">{column}</span>
                      <span className="text-sm text-white truncate">{label}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{formatCurrency(value)}</span>
                  </div>
                ))}
            </div>
          </div>

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
              <strong>How to use:</strong> Click "Copy Row" to copy all values, then paste into your Google Sheet
              in the row for <span className="text-white">{month}</span>. The data is tab-separated and will
              fill columns A through X automatically.
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
                  Copy Row
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
