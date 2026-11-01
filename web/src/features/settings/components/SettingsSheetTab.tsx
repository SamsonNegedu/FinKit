import { Loader2, RefreshCw } from 'lucide-react'
import type { SheetTab } from '@/features/export/api/export.api'

export interface SettingsSheetTabProps {
  sheetId: string
  tabName: string
  monthFormat: 'short' | 'long' | 'numeric'
  availableTabs: SheetTab[]
  loadingTabs: boolean
  sheetError: string
  onSheetIdChange: (value: string) => void
  onFetchTabs: () => void
  onTabNameChange: (value: string) => void
  onMonthFormatChange: (value: 'short' | 'long' | 'numeric') => void
}

export default function SettingsSheetTab({
  sheetId,
  tabName,
  monthFormat,
  availableTabs,
  loadingTabs,
  sheetError,
  onSheetIdChange,
  onFetchTabs,
  onTabNameChange,
  onMonthFormatChange,
}: SettingsSheetTabProps) {
  return (
    <section>
      <h3 className="text-sm font-medium text-midnight-300 mb-3">Google Sheet</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="sheet-id" className="block text-sm text-midnight-400 mb-1">
            Sheet URL or ID
          </label>
          <div className="flex gap-2">
            <input
              id="sheet-id"
              type="text"
              value={sheetId}
              onChange={e => onSheetIdChange(e.target.value)}
              placeholder="Paste Google Sheets URL or ID"
              className="input flex-1"
            />
            <button
              onClick={onFetchTabs}
              disabled={loadingTabs || !sheetId}
              className="btn-secondary flex items-center gap-2 shrink-0"
              title="Fetch available tabs"
            >
              {loadingTabs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden sm:inline">Load Tabs</span>
            </button>
          </div>
          {sheetError && <p className="text-xs text-red-400 mt-1">{sheetError}</p>}
          {!sheetError && sheetId && (
            <p className="text-xs text-midnight-500 mt-1">
              Sheet ID: <span className="font-mono text-midnight-400">{sheetId.slice(0, 20)}...</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sheet-tab" className="block text-sm text-midnight-400 mb-1">
              Tab / Sheet Name
            </label>
            {availableTabs.length > 0 ? (
              <select
                id="sheet-tab"
                value={tabName}
                onChange={e => onTabNameChange(e.target.value)}
                className="input w-full"
              >
                {availableTabs.map(sheetTab => (
                  <option key={sheetTab.index} value={sheetTab.title}>
                    {sheetTab.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="sheet-tab"
                type="text"
                value={tabName}
                onChange={e => onTabNameChange(e.target.value)}
                placeholder="2026"
                className="input w-full"
              />
            )}
            <p className="text-xs text-midnight-500 mt-1">
              {availableTabs.length > 0
                ? `${availableTabs.length} tabs found`
                : 'Click "Load Tabs" to see available tabs'}
            </p>
          </div>

          <div>
            <label htmlFor="month-format" className="block text-sm text-midnight-400 mb-1">
              Month Format
            </label>
            <select
              id="month-format"
              value={monthFormat}
              onChange={e => onMonthFormatChange(e.target.value as 'short' | 'long' | 'numeric')}
              className="input w-full"
            >
              <option value="short">Short (Jan, Feb, ...)</option>
              <option value="long">Long (January, February, ...)</option>
              <option value="numeric">Numeric (01, 02, ...)</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  )
}
