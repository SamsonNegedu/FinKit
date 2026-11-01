import type { SheetColumn, SheetConfig } from '@/shared/types'
import { fetchSheetLayout } from '@/features/export/api/export.api'
import { classifyHeaders, columnIndex, columnLetter, configPartsFromLayout, norm } from './layoutCore'

export async function syncSheetLayout(config: SheetConfig): Promise<SheetConfig> {
  const { headerRow, columns } = await fetchSheetLayout(config.sheetId, config.tabName)
  const layout = classifyHeaders(columns)
  return {
    ...config,
    ...configPartsFromLayout(layout),
    layout,
    headerRow,
    layoutSyncedAt: Date.now(),
  }
}

export function layoutFromPaste(text: string, startColumn = 'A'): { layout: SheetColumn[]; headerRow: number } | null {
  const rows = text
    .replace(/\r/g, '')
    .split('\n')
    .map(r => r.split('\t').map(c => c.trim()))
  const filled = rows.filter(r => r.some(Boolean))
  if (filled.length === 0) return null
  const row =
    filled.find(r => r.some(c => norm(c) === 'totalexpenditure')) ??
    filled.reduce((best, r) => (r.filter(Boolean).length > best.filter(Boolean).length ? r : best))
  const start = Math.max(0, columnIndex((startColumn || 'A').toUpperCase()))
  const headers = row.map((name, i) => ({ column: columnLetter(start + i), name })).filter(h => h.name)
  if (headers.length < 2) return null
  return { layout: classifyHeaders(headers), headerRow: 0 }
}
