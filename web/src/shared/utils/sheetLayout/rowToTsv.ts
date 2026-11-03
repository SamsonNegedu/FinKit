import { formatForSheet } from '@/shared/utils/format'
import type { BuiltRow } from './buildSheetRow'

/** One sheet row as tab-separated text, ready to paste: the month label, then a number per column, empty where the sheet is left alone. */
export function rowToTsv(row: BuiltRow, label: string): string {
  return row.cells.map(c => (c.kind === 'month' ? label : c.value === null ? '' : formatForSheet(c.value))).join('\t')
}
