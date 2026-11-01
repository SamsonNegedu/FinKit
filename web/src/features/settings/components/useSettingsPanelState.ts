import { useState, useEffect, useRef, useReducer } from 'react'
import { SheetConfig, CategoryMapping, SheetColumn } from '@/shared/types'
import { configPartsFromLayout, syncSheetLayout, layoutCategories, layoutFromPaste } from '@/shared/utils/sheetLayout'
import { getSheetConfig } from '@/features/settings/api/settings.api'
import { addMappingRow, updateMappingRow } from './settingsPanelMappings'
import { DEFAULT_CONSTANTS, DEFAULT_MAPPINGS } from './settingsSheetDefaults'
import { extractSheetId, fetchSheetMetadata, type SheetTab } from '@/features/export/api/export.api'
import { buildSheetConfig, persistSheetConfig } from './settingsPanelSave'
import {
  initialSettingsAsyncState,
  settingsAsyncReducer,
  settingsLoading,
  settingsLoadingTabs,
  settingsSaving,
  settingsSyncing,
} from './settingsAsyncPhase'

export function useSettingsPanelState(config: SheetConfig | null, onSave: (config: SheetConfig) => void) {
  const [asyncState, dispatchAsync] = useReducer(settingsAsyncReducer, initialSettingsAsyncState)
  const [sheetId, setSheetId] = useState(config?.sheetId || '')
  const [tabName, setTabName] = useState(config?.tabName || '2026')
  const [monthFormat, setMonthFormat] = useState<'short' | 'long' | 'numeric'>(config?.monthFormat || 'short')
  const [mappings, setMappings] = useState<CategoryMapping[]>(config?.categoryMappings || DEFAULT_MAPPINGS)
  const [constantColumns, setConstantColumns] = useState<string[]>(config?.constantColumns || DEFAULT_CONSTANTS)
  const [availableTabs, setAvailableTabs] = useState<SheetTab[]>([])
  const [layout, setLayout] = useState<SheetColumn[] | undefined>(config?.layout)
  const [headerRow, setHeaderRow] = useState<number | undefined>(config?.headerRow)
  const [pasteText, setPasteText] = useState('')
  const [pasteStart, setPasteStart] = useState('A')
  const [syncMessage, setSyncMessage] = useState('')
  const hasFetched = useRef(false)

  const loading = settingsLoading(asyncState)
  const saving = settingsSaving(asyncState)
  const loadingTabs = settingsLoadingTabs(asyncState)
  const syncing = settingsSyncing(asyncState)
  const sheetError = asyncState.sheetError

  useEffect(() => {
    if (!config && !hasFetched.current) {
      hasFetched.current = true
      dispatchAsync({ type: 'START', operation: 'loading_config' })
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
        dispatchAsync({ type: 'DONE' })
      })
    }
  }, [config])

  const handleSheetIdChange = (value: string) => {
    setSheetId(extractSheetId(value))
    dispatchAsync({ type: 'CLEAR_ERROR' })
    setAvailableTabs([])
  }

  const fetchSheetTabs = async () => {
    if (!sheetId || sheetId.length < 10) {
      dispatchAsync({ type: 'FAIL', message: 'Please enter a valid Sheet ID or URL' })
      return
    }

    dispatchAsync({ type: 'START', operation: 'loading_tabs' })

    try {
      const tabs = await fetchSheetMetadata(sheetId)
      setAvailableTabs(tabs)
      if (tabs.length > 0 && !tabName) {
        setTabName(tabs[0].title)
      }
      dispatchAsync({ type: 'DONE' })
    } catch (err) {
      dispatchAsync({
        type: 'FAIL',
        message: err instanceof Error ? err.message : 'Failed to connect to sheet',
      })
    }
  }

  const handleApplyPaste = () => {
    const result = layoutFromPaste(pasteText, pasteStart)
    if (!result) {
      setSyncMessage('')
      dispatchAsync({
        type: 'FAIL',
        message: "Couldn't find a header row. Copy the cells of your header row in Google Sheets and paste them here.",
      })
      return
    }
    const parts = configPartsFromLayout(result.layout)
    setLayout(result.layout)
    setHeaderRow(undefined)
    setMappings(parts.categoryMappings)
    setConstantColumns(parts.constantColumns)
    dispatchAsync({ type: 'DONE' })
    setPasteText('')
    setSyncMessage(`Applied ${parts.categoryMappings.length} categories from your pasted header row`)
  }

  const handleSyncLayout = async () => {
    if (!sheetId || !tabName) {
      dispatchAsync({ type: 'FAIL', message: 'Enter a Sheet ID and tab first' })
      return
    }
    dispatchAsync({ type: 'START', operation: 'syncing_layout' })
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
      dispatchAsync({ type: 'DONE' })
    } catch (err) {
      dispatchAsync({
        type: 'FAIL',
        message: err instanceof Error ? err.message : 'Failed to read the sheet',
      })
    }
  }

  const handleAddMapping = () => setMappings(addMappingRow(mappings))
  const handleRemoveMapping = (index: number) => setMappings(mappings.filter((_, i) => i !== index))
  const handleMappingChange = (index: number, field: 'appCategory' | 'sheetColumn', value: string) =>
    setMappings(updateMappingRow(mappings, index, field, value))

  const handleSave = async () => {
    if (!sheetId) {
      alert('Please enter a Google Sheet ID')
      return
    }

    const newConfig = buildSheetConfig({
      sheetId,
      tabName,
      monthFormat,
      mappings,
      constantColumns,
      layout,
      headerRow,
    })

    dispatchAsync({ type: 'START', operation: 'saving' })
    await persistSheetConfig(newConfig)
    onSave(newConfig)
    dispatchAsync({ type: 'DONE' })
  }

  return {
    loading,
    saving,
    asyncOperation: asyncState.operation,
    sheetTab: {
      sheetId,
      tabName,
      monthFormat,
      availableTabs,
      loadingTabs,
      sheetError,
      handleSheetIdChange,
      fetchSheetTabs,
      setTabName,
      setMonthFormat,
    },
    columnsTab: {
      pasteText,
      pasteStart,
      syncMessage,
      layout,
      syncing,
      sheetId,
      mappings,
      constantColumns,
      setPasteText,
      setPasteStart,
      handleApplyPaste,
      handleSyncLayout,
      handleAddMapping,
      handleRemoveMapping,
      handleMappingChange,
      setConstantColumns,
    },
    handleSave,
  }
}
