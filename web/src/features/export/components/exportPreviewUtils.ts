import { formatForSheet } from '@/shared/utils/format'
import { buildSheetRow } from '@/shared/utils/sheetLayout'

export function exportCellStyle(kind: string, value: number | null): string {
  if (kind === 'month') return 'bg-midnight-800 text-white'
  if (value === null) return 'bg-midnight-900 text-midnight-600'
  switch (kind) {
    case 'total':
      return 'bg-expense/20 text-expense'
    case 'income':
      return 'bg-income/20 text-income'
    case 'incomeAfter':
    case 'net':
      return value >= 0 ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
    case 'savings':
      return 'bg-blue-500/20 text-blue-400'
    case 'investment':
      return 'bg-cyan-500/20 text-cyan-400'
    default:
      return value > 0 ? 'bg-midnight-800 text-white' : 'bg-midnight-800/50 text-midnight-500'
  }
}

export function rowToTsv(row: ReturnType<typeof buildSheetRow>, label: string) {
  return row.cells.map(c => (c.kind === 'month' ? label : c.value === null ? '' : formatForSheet(c.value))).join('\t')
}
