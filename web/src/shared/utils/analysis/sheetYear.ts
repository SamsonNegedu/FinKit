import type { SheetColumn, SheetColumnKind, Transaction } from '@/shared/types'
import { countedDate } from '@/shared/utils/countsToMonth'
import { parseLocalDate } from '@/shared/utils/dates'
import { buildSheetRow, rowToTsv } from '@/shared/utils/sheetLayout'

export interface MonthGroup {
  /** "2026-03", so keys sort by time */
  key: string
  label: string
  year: number
  /** 0-11, as in Date */
  month: number
  txs: Transaction[]
}

/** Transactions grouped by the month they count in, oldest first. */
export function monthGroups(transactions: Transaction[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>()

  for (const tx of transactions) {
    const d = parseLocalDate(countedDate(tx))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const group = groups.get(key) ?? {
      key,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      txs: [],
    }

    group.txs.push(tx)
    groups.set(key, group)
  }

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export interface YearColumn {
  column: string
  label: string
  kind: SheetColumnKind
}

export interface YearGrid {
  columns: YearColumn[]
  rows: Array<{ month: MonthGroup; values: number[] }>
  /** Each column added up over the months; net income and the other worked-out columns add up the same way */
  totals: number[]
  /** Spending in categories your sheet has no column for, so it is not in the totals above */
  unmapped: Array<{ category: string; total: number }>
}

/**
 * Months laid out the way the export sheet is: a row per month, a column per sheet column in the sheet's own order,
 * every number worked out by the same rules as the exported row (excluded and transfers left out, savings and
 * investments apart from spending). The sheet's month and free-text columns are not part of it.
 */
export function yearGrid(months: MonthGroup[], layout: SheetColumn[]): YearGrid {
  const built = months.map(m => ({ month: m, row: buildSheetRow(m.txs, layout, m.label) }))
  const shown = (built[0]?.row.cells ?? [])
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.kind !== 'month' && c.kind !== 'other')
  const rows = built.map(({ month, row }) => ({ month, values: shown.map(({ i }) => row.cells[i].value ?? 0) }))
  const unmapped = new Map<string, number>()

  for (const { row } of built) {
    for (const u of row.unmapped) {
      unmapped.set(u.category, (unmapped.get(u.category) ?? 0) + u.total)
    }
  }

  return {
    columns: shown.map(({ c }) => ({ column: c.column, label: c.label, kind: c.kind })),
    rows,
    totals: shown.map((_, j) => rows.reduce((sum, r) => sum + r.values[j], 0)),
    unmapped: [...unmapped].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
  }
}

/** A month as the row to paste into the sheet. */
export function monthTsv(month: MonthGroup, layout: SheetColumn[]): string {
  return rowToTsv(buildSheetRow(month.txs, layout, month.label), month.label)
}

/** Several months as rows to paste, one per line, in the order given. */
export function monthsTsv(months: MonthGroup[], layout: SheetColumn[]): string {
  return months.map(m => monthTsv(m, layout)).join('\n')
}

/** The month to reconcile: the latest one that has ended. A month still in progress is only half a row. */
export function latestCompleteMonth(months: MonthGroup[], thisMonth: string): MonthGroup | undefined {
  const ended = months.filter(m => m.key < thisMonth)

  return ended[ended.length - 1] ?? months[months.length - 1]
}
