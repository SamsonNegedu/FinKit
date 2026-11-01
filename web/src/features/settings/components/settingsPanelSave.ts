import { SheetConfig, CategoryMapping, SheetColumn } from '@/shared/types'
import { configPartsFromLayout } from '@/shared/utils/sheetLayout'
import { saveSheetConfig } from '@/features/settings/api/settings.api'

export function buildSheetConfig(params: {
  sheetId: string
  tabName: string
  monthFormat: SheetConfig['monthFormat']
  mappings: CategoryMapping[]
  constantColumns: string[]
  layout: SheetColumn[] | undefined
  headerRow: number | undefined
}): SheetConfig {
  const { sheetId, tabName, monthFormat, mappings, constantColumns, layout, headerRow } = params
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

  newConfig.categoryMappings = mappings.filter(m => m.sheetColumn)
  newConfig.constantColumns = constantColumns

  return newConfig
}

export async function persistSheetConfig(config: SheetConfig): Promise<void> {
  const saved = await saveSheetConfig(config)

  if (!saved) {
    console.warn('Failed to save to server, using local only')
  }
}
