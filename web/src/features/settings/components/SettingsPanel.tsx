import { Loader2 } from 'lucide-react'
import { SheetConfig } from '@/shared/types'
import SettingsSheetTab from './SettingsSheetTab'
import SettingsColumnsTab from './SettingsColumnsTab'
import { useSettingsPanelState } from './useSettingsPanelState'

interface SettingsPanelProps {
  config: SheetConfig | null
  onSave: (config: SheetConfig) => void
  section: 'sheet' | 'columns'
}

export default function SettingsPanel({ config, onSave, section: tab }: SettingsPanelProps) {
  const { loading, saving, sheetTab, columnsTab, handleSave } = useSettingsPanelState(config, onSave)

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="ml-3 text-midnight-400">Loading settings...</span>
          </div>
        ) : (
          <>
            {tab === 'sheet' && (
              <SettingsSheetTab
                sheetId={sheetTab.sheetId}
                tabName={sheetTab.tabName}
                monthFormat={sheetTab.monthFormat}
                availableTabs={sheetTab.availableTabs}
                loadingTabs={sheetTab.loadingTabs}
                sheetError={sheetTab.sheetError}
                onSheetIdChange={sheetTab.handleSheetIdChange}
                onFetchTabs={sheetTab.fetchSheetTabs}
                onTabNameChange={sheetTab.setTabName}
                onMonthFormatChange={sheetTab.setMonthFormat}
              />
            )}

            {tab === 'columns' && (
              <SettingsColumnsTab
                pasteText={columnsTab.pasteText}
                pasteStart={columnsTab.pasteStart}
                syncMessage={columnsTab.syncMessage}
                layout={columnsTab.layout}
                syncing={columnsTab.syncing}
                sheetId={columnsTab.sheetId}
                mappings={columnsTab.mappings}
                constantColumns={columnsTab.constantColumns}
                onPasteTextChange={columnsTab.setPasteText}
                onPasteStartChange={columnsTab.setPasteStart}
                onApplyPaste={columnsTab.handleApplyPaste}
                onSyncLayout={columnsTab.handleSyncLayout}
                onAddMapping={columnsTab.handleAddMapping}
                onRemoveMapping={columnsTab.handleRemoveMapping}
                onMappingChange={columnsTab.handleMappingChange}
                onConstantColumnsChange={columnsTab.setConstantColumns}
              />
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-line-strong">
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
    </div>
  )
}
