import { formatCurrency } from '@/shared/utils/format'
import { buildSheetRow } from '@/shared/utils/sheetLayout'
import { exportCellStyle } from './exportPreviewUtils'

interface ExportPreviewBodyProps {
  month: string
  sheetTabName?: string
  years: number[]
  yearMonths: { key: string; label: string }[]
  activeYear: number
  activeMonthKey?: string
  previewData: ReturnType<typeof buildSheetRow>
  onYearChange: (year: number) => void
  onMonthSelect: (key: string) => void
}

export default function ExportPreviewBody({
  month,
  sheetTabName,
  years,
  yearMonths,
  activeYear,
  activeMonthKey,
  previewData,
  onYearChange,
  onMonthSelect,
}: ExportPreviewBodyProps) {
  return (
    <div className="space-y-6">
      <div className="bg-midnight-800 rounded-lg p-4">
        <p className="text-sm text-midnight-400">Data for</p>
        <p className="text-white font-medium">
          {month}
          {sheetTabName ? ` → sheet tab “${sheetTabName}”` : ''}
        </p>
      </div>

      {(years.length > 1 || yearMonths.length > 1) && (
        <div className="flex flex-wrap items-center gap-2">
          {years.length > 1 && (
            <select
              aria-label="Year"
              className="input py-1.5 text-sm"
              value={activeYear}
              onChange={e => onYearChange(Number(e.target.value))}
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          {yearMonths.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Month">
              {yearMonths.map(m => (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={m.key === activeMonthKey}
                  onClick={() => onMonthSelect(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    m.key === activeMonthKey
                      ? 'bg-accent text-white'
                      : 'bg-midnight-800 text-midnight-300 hover:bg-midnight-700'
                  }`}
                >
                  {m.label.replace(/ \d{4}$/, '')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-midnight-300 mb-3">Sheet Row Preview</h3>
        <div className="bg-midnight-950 rounded-lg p-4 overflow-x-auto">
          <div className="inline-flex gap-1 min-w-max">
            {previewData.cells.map(cell => (
              <div key={cell.column} className="flex flex-col items-center">
                <span className="text-xs text-midnight-500 mb-1">{cell.column}</span>
                <div
                  className={`px-3 py-2 rounded text-sm whitespace-nowrap ${exportCellStyle(cell.kind, cell.value)}`}
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
    </div>
  )
}
