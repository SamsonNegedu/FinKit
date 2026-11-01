import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react'
import { SheetConfig, CategoryMapping, SheetColumn } from '../types'
import { configPartsFromLayout, syncSheetLayout, layoutCategories, layoutFromPaste } from '../lib/sheetLayout'
import { getAvailableCategories } from '../lib/categorizer'
import { getSheetConfig, saveSheetConfig } from '../lib/api'
import RulesManager from './RulesManager'

interface SettingsPanelProps {
  config: SheetConfig | null
  onSave: (config: SheetConfig) => void
  section: 'sheet' | 'columns' | 'rules'
}

interface SheetTab {
  title: string
  index: number
}

// Default column mappings matching your Google Sheet structure:
// Month | Rent | Eating Out | Personal Entertainment | Subscriptions | Car(Miles) | Public Transport |
// Internet | Electricity | Insurance | Travel | Groceries | Family | Radio Tax | Health & Wellbeing |
// Shopping | Other | Gifts | Total Expenditure | Income | Income After Expenditure | Gross Savings |
// Gross Investment | Net Income
const DEFAULT_MAPPINGS: CategoryMapping[] = [
  { appCategory: 'Rent', sheetColumn: 'B' },
  { appCategory: 'Eating Out', sheetColumn: 'C' },
  { appCategory: 'Personal Entertainment', sheetColumn: 'D' },
  { appCategory: 'Subscriptions', sheetColumn: 'E' },
  { appCategory: 'Car', sheetColumn: 'F' }, // Car(Miles)
  { appCategory: 'Public Transport', sheetColumn: 'G' },
  { appCategory: 'Internet', sheetColumn: 'H' },
  { appCategory: 'Electricity', sheetColumn: 'I' },
  { appCategory: 'Insurance', sheetColumn: 'J' },
  { appCategory: 'Travel', sheetColumn: 'K' },
  { appCategory: 'Groceries', sheetColumn: 'L' },
  { appCategory: 'Family', sheetColumn: 'M' },
  { appCategory: 'Radio Tax', sheetColumn: 'N' },
  { appCategory: 'Health & Wellbeing', sheetColumn: 'O' },
  { appCategory: 'Shopping', sheetColumn: 'P' },
  { appCategory: 'Other', sheetColumn: 'Q' },
  { appCategory: 'Gifts', sheetColumn: 'R' },
]

// Columns that are calculated formulas and should not be overwritten
const DEFAULT_CONSTANTS = ['S', 'T', 'U', 'V', 'W', 'X'] // Total Expenditure, Income, etc.

export default function SettingsPanel({ config, onSave, section: tab }: SettingsPanelProps) {
  const [sheetId, setSheetId] = useState(config?.sheetId || '')
  const [tabName, setTabName] = useState(config?.tabName || '2026')
  const [monthFormat, setMonthFormat] = useState<'short' | 'long' | 'numeric'>(config?.monthFormat || 'short')
  const [mappings, setMappings] = useState<CategoryMapping[]>(config?.categoryMappings || DEFAULT_MAPPINGS)
  const [constantColumns, setConstantColumns] = useState<string[]>(config?.constantColumns || DEFAULT_CONSTANTS)
  const [availableTabs, setAvailableTabs] = useState<SheetTab[]>([])
  const [loadingTabs, setLoadingTabs] = useState(false)
  const [sheetError, setSheetError] = useState('')
  const [saving, setSaving] = useState(false)
  const [layout, setLayout] = useState<SheetColumn[] | undefined>(config?.layout)
  const [headerRow, setHeaderRow] = useState<number | undefined>(config?.headerRow)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [pasteStart, setPasteStart] = useState('A')
  const [loading, setLoading] = useState(!config) // Load from API if no config passed
  const hasFetched = useRef(false)

  // Fetch settings from API on mount if no config provided (only once)
  useEffect(() => {
    if (!config && !hasFetched.current) {
      hasFetched.current = true
      setLoading(true)
      getSheetConfig().then(serverConfig => {
        if (serverConfig) {
          setSheetId(serverConfig.sheetId || '')
          setTabName(serverConfig.tabName || '2026')
          setMonthFormat(serverConfig.monthFormat || 'short')
          setMappings(serverConfig.categoryMappings || DEFAULT_MAPPINGS)
          setConstantColumns(serverConfig.constantColumns || DEFAULT_CONSTANTS)
          setLayout(serverConfig.layout)
          setHeaderRow(serverConfig.headerRow)
        }
        setLoading(false)
      })
    }
  }, [config])

  // Extract sheet ID from URL if pasted
  const extractSheetId = (input: string): string => {
    // Handle full URLs like:
    // https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
    // https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=123
    if (input.includes('docs.google.com/spreadsheets')) {
      const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match) {
        return match[1]
      }
    }
    // Already just an ID
    return input.trim()
  }

  const handleSheetIdChange = (value: string) => {
    const extractedId = extractSheetId(value)
    setSheetId(extractedId)
    setSheetError('')
    setAvailableTabs([])
  }

  // Fetch available tabs from the sheet
  const fetchSheetTabs = async () => {
    if (!sheetId || sheetId.length < 10) {
      setSheetError('Please enter a valid Sheet ID or URL')
      return
    }

    setLoadingTabs(true)
    setSheetError('')

    try {
      const response = await fetch('/api/export/sheets/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch sheet info')
      }

      const data = await response.json()
      const tabs = data.data?.sheets || []
      setAvailableTabs(tabs)

      // Auto-select first tab if none selected
      if (tabs.length > 0 && !tabName) {
        setTabName(tabs[0].title)
      }
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'Failed to connect to sheet')
    } finally {
      setLoadingTabs(false)
    }
  }

  // Paste your sheet's header row (no API access or credentials needed)
  const handleApplyPaste = () => {
    const result = layoutFromPaste(pasteText, pasteStart)
    if (!result) {
      setSyncMessage('')
      setSheetError(
        "Couldn't find a header row. Copy the cells of your header row in Google Sheets and paste them here.",
      )
      return
    }
    const parts = configPartsFromLayout(result.layout)
    setLayout(result.layout)
    setHeaderRow(undefined)
    setMappings(parts.categoryMappings)
    setConstantColumns(parts.constantColumns)
    setSheetError('')
    setPasteText('')
    setSyncMessage(`Applied ${parts.categoryMappings.length} categories from your pasted header row`)
  }

  // Read the real column layout from the sheet (needs the API to have Google access): categories, order and formula columns follow it
  const handleSyncLayout = async () => {
    if (!sheetId || !tabName) {
      setSheetError('Enter a Sheet ID and tab first')
      return
    }
    setSyncing(true)
    setSheetError('')
    setSyncMessage('')
    try {
      const synced = await syncSheetLayout({
        sheetId,
        tabName,
        monthFormat,
        monthColumn: 'A',
        categoryMappings: mappings,
        constantColumns,
      })
      setLayout(synced.layout)
      setHeaderRow(synced.headerRow)
      setMappings(synced.categoryMappings)
      setConstantColumns(synced.constantColumns)
      const names = layoutCategories(synced.layout || [])
      setSyncMessage(`Synced ${names.length} categories from row ${synced.headerRow}`)
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : 'Failed to read the sheet')
    } finally {
      setSyncing(false)
    }
  }

  const handleAddMapping = () => {
    const unmappedCategories = getAvailableCategories().filter(
      c => !mappings.find(m => m.appCategory === c) && c !== 'Transfer' && c !== 'Income',
    )
    if (unmappedCategories.length > 0) {
      setMappings([...mappings, { appCategory: unmappedCategories[0], sheetColumn: '' }])
    }
  }

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index))
  }

  const handleMappingChange = (index: number, field: 'appCategory' | 'sheetColumn', value: string) => {
    const updated = [...mappings]
    updated[index] = { ...updated[index], [field]: value }
    setMappings(updated)
  }

  const handleSave = async () => {
    if (!sheetId) {
      alert('Please enter a Google Sheet ID')
      return
    }

    const newConfig: SheetConfig = {
      sheetId,
      tabName,
      monthFormat,
      monthColumn: 'A',
      categoryMappings: mappings.filter(m => m.sheetColumn),
      constantColumns,
      ...(layout ? { ...configPartsFromLayout(layout), layout, headerRow } : {}),
      layoutSyncedAt: layout ? Date.now() : undefined,
    }
    // Keep any manual tweaks to the mapping table over the derived ones
    newConfig.categoryMappings = mappings.filter(m => m.sheetColumn)
    newConfig.constantColumns = constantColumns

    setSaving(true)

    // Save to backend API (persists across sessions)
    const saved = await saveSheetConfig(newConfig)
    if (!saved) {
      console.warn('Failed to save to server, using local only')
    }

    // Update parent component state
    onSave(newConfig)
    setSaving(false)
  }

  return (
    <div className="card space-y-6">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-midnight-400">Loading settings...</span>
          </div>
        ) : (
          <>
            {tab === 'sheet' && (
              <>
                {/* Sheet Configuration */}
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
                          onChange={e => handleSheetIdChange(e.target.value)}
                          placeholder="Paste Google Sheets URL or ID"
                          className="input flex-1"
                        />
                        <button
                          onClick={fetchSheetTabs}
                          disabled={loadingTabs || !sheetId}
                          className="btn-secondary flex items-center gap-2 shrink-0"
                          title="Fetch available tabs"
                        >
                          {loadingTabs ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
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
                            onChange={e => setTabName(e.target.value)}
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
                            onChange={e => setTabName(e.target.value)}
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
                          onChange={e => setMonthFormat(e.target.value as 'short' | 'long' | 'numeric')}
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
              </>
            )}

            {tab === 'columns' && (
              <>
                {/* Match my sheet */}
                <section className="p-4 bg-midnight-800 rounded-lg space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-midnight-200">Match my sheet</h3>
                    <p className="text-xs text-midnight-400 mt-1">
                      In Google Sheets, select your header row (Month … Net Income), copy it, and paste it below.
                      Categories, their order and the preview row will follow your sheet. When you add a column, paste
                      the row again.
                    </p>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste header row here"
                    rows={2}
                    className="input w-full text-sm font-mono"
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-midnight-400 flex items-center gap-2">
                      First copied cell is in column
                      <input
                        type="text"
                        value={pasteStart}
                        onChange={e => setPasteStart(e.target.value.toUpperCase())}
                        maxLength={2}
                        className="input w-14 text-center text-sm py-1"
                      />
                    </label>
                    <button
                      onClick={handleApplyPaste}
                      disabled={!pasteText.trim()}
                      className="btn-primary text-sm ml-auto"
                    >
                      Apply
                    </button>
                  </div>
                  {syncMessage && <p className="text-xs text-income">{syncMessage}</p>}
                  {!syncMessage && layout && (
                    <p className="text-xs text-midnight-500">
                      Using your sheet layout ({layoutCategories(layout).length} categories)
                    </p>
                  )}
                  <details className="text-xs text-midnight-400">
                    <summary className="cursor-pointer">Or read it automatically (needs API Google access)</summary>
                    <button
                      onClick={handleSyncLayout}
                      disabled={syncing || !sheetId}
                      className="btn-secondary text-sm flex items-center gap-2 mt-2"
                    >
                      {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Sync from sheet
                    </button>
                  </details>
                </section>

                {/* Category Mappings */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-midnight-300">Category to Column Mapping</h3>
                    <button
                      onClick={handleAddMapping}
                      className="flex items-center gap-1 text-sm text-accent hover:text-accent-light"
                    >
                      <Plus className="w-4 h-4" />
                      Add Mapping
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[minmax(0,1fr),80px,40px] gap-2 text-xs text-midnight-400 px-2">
                      <span>Category</span>
                      <span>Column</span>
                      <span></span>
                    </div>

                    {mappings.map((mapping, index) => (
                      <div key={index} className="grid grid-cols-[minmax(0,1fr),80px,40px] gap-2 items-center">
                        <select
                          value={mapping.appCategory}
                          onChange={e => handleMappingChange(index, 'appCategory', e.target.value)}
                          className="input text-sm"
                        >
                          {[
                            ...new Set([
                              mapping.appCategory,
                              ...getAvailableCategories().filter(c => c !== 'Transfer' && c !== 'Income'),
                            ]),
                          ].map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={mapping.sheetColumn}
                          onChange={e => handleMappingChange(index, 'sheetColumn', e.target.value.toUpperCase())}
                          placeholder="B"
                          className="input text-sm text-center"
                          maxLength={2}
                        />

                        <button
                          onClick={() => handleRemoveMapping(index)}
                          className="p-2 hover:bg-midnight-800 rounded-lg text-midnight-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Constant Columns */}
                <section>
                  <h3 className="text-sm font-medium text-midnight-300 mb-3">Formula Columns (Don't Overwrite)</h3>
                  <p className="text-xs text-midnight-500 mb-2">
                    Columns with formulas (Total Expenditure, Income After Expenditure, etc.) that should not be
                    overwritten
                  </p>
                  <input
                    type="text"
                    value={constantColumns.join(', ')}
                    onChange={e =>
                      setConstantColumns(
                        e.target.value
                          .split(',')
                          .map(s => s.trim().toUpperCase())
                          .filter(Boolean),
                      )
                    }
                    placeholder="S, U, X"
                    className="input w-full"
                  />
                  <p className="text-xs text-midnight-500 mt-1">
                    {layout
                      ? `From your sheet: ${
                          layout
                            .filter(c => constantColumns.includes(c.column))
                            .map(c => `${c.column} (${c.name})`)
                            .join(', ') || 'none'
                        }`
                      : 'Default: S (Total Expenditure), U (Income After Expenditure), X (Net Income)'}
                  </p>
                </section>
              </>
            )}

            {tab === 'rules' && <RulesManager />}
          </>
        )}
      </div>

      {tab !== 'rules' && (
        <div className="flex justify-end gap-3 pt-4 border-t border-midnight-700">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2" disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
