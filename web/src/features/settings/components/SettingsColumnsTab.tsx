import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { CategoryMapping, SheetColumn } from '@/shared/types'
import { getAvailableCategories } from '@/shared/utils/categorizer'
import { layoutCategories } from '@/shared/utils/sheetLayout'

export interface SettingsColumnsTabProps {
  pasteText: string
  pasteStart: string
  syncMessage: string
  layout: SheetColumn[] | undefined
  syncing: boolean
  sheetId: string
  mappings: CategoryMapping[]
  constantColumns: string[]
  onPasteTextChange: (value: string) => void
  onPasteStartChange: (value: string) => void
  onApplyPaste: () => void
  onSyncLayout: () => void
  onAddMapping: () => void
  onRemoveMapping: (index: number) => void
  onMappingChange: (index: number, field: 'appCategory' | 'sheetColumn', value: string) => void
  onConstantColumnsChange: (columns: string[]) => void
}

export default function SettingsColumnsTab({
  pasteText,
  pasteStart,
  syncMessage,
  layout,
  syncing,
  sheetId,
  mappings,
  constantColumns,
  onPasteTextChange,
  onPasteStartChange,
  onApplyPaste,
  onSyncLayout,
  onAddMapping,
  onRemoveMapping,
  onMappingChange,
  onConstantColumnsChange,
}: SettingsColumnsTabProps) {
  return (
    <>
      <section className="p-4 bg-midnight-800 rounded-lg space-y-3">
        <div>
          <h3 className="text-sm font-medium text-midnight-200">Match my sheet</h3>
          <p className="text-xs text-midnight-400 mt-1">
            In Google Sheets, select your header row (Month … Net Income), copy it, and paste it below. Categories,
            their order and the preview row will follow your sheet. When you add a column, paste the row again.
          </p>
        </div>
        <textarea
          value={pasteText}
          onChange={e => onPasteTextChange(e.target.value)}
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
              onChange={e => onPasteStartChange(e.target.value.toUpperCase())}
              maxLength={2}
              className="input w-14 text-center text-sm py-1"
            />
          </label>
          <button onClick={onApplyPaste} disabled={!pasteText.trim()} className="btn-primary text-sm ml-auto">
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
            onClick={onSyncLayout}
            disabled={syncing || !sheetId}
            className="btn-secondary text-sm flex items-center gap-2 mt-2"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync from sheet
          </button>
        </details>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-midnight-300">Category to Column Mapping</h3>
          <button
            onClick={onAddMapping}
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
                onChange={e => onMappingChange(index, 'appCategory', e.target.value)}
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
                onChange={e => onMappingChange(index, 'sheetColumn', e.target.value.toUpperCase())}
                placeholder="B"
                className="input text-sm text-center"
                maxLength={2}
              />

              <button
                onClick={() => onRemoveMapping(index)}
                className="p-2 hover:bg-midnight-800 rounded-lg text-midnight-400 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-midnight-300 mb-3">Formula Columns (Don't Overwrite)</h3>
        <p className="text-xs text-midnight-500 mb-2">
          Columns with formulas (Total Expenditure, Income After Expenditure, etc.) that should not be overwritten
        </p>
        <input
          type="text"
          value={constantColumns.join(', ')}
          onChange={e =>
            onConstantColumnsChange(
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
  )
}
