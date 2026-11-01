// The Google Sheet is the source of truth for categories and column order.
// This module turns its header row into a typed layout and builds a row from transactions.
import { SheetColumn, SheetColumnKind, SheetConfig, Transaction, CategoryMapping } from '../types'
import { EXPENSE_CATEGORIES } from './categorizer'
import { fetchSheetLayout, type SheetHeaderColumn } from './api'

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// "Car(Miles)" -> "Car": the app category is the header without a trailing bracket note
export function categoryFromHeader(header: string): string {
  return header.replace(/\s*[([].*$/, '').trim() || header.trim()
}

const NAMED_KINDS: Record<string, SheetColumnKind> = {
  totalexpenditure: 'total',
  income: 'income',
  incomeafterexpenditure: 'incomeAfter',
  grosssavings: 'savings',
  savings: 'savings',
  grossinvestment: 'investment',
  investment: 'investment',
  netincome: 'net',
}

export function columnIndex(letter: string): number {
  return letter.split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
}

export function columnLetter(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

/**
 * Everything between the month column and "Total Expenditure" is an expense category,
 * so adding a column there needs no code change. Named columns after it are recognised by
 * name; anything else after it is treated as a formula/other column and left alone.
 */
export function classifyHeaders(headers: SheetHeaderColumn[]): SheetColumn[] {
  const sorted = [...headers].sort((a, b) => columnIndex(a.column) - columnIndex(b.column))
  const totalIdx = sorted.findIndex(h => norm(h.name) === 'totalexpenditure')
  const monthIdx = Math.max(0, sorted.findIndex(h => norm(h.name) === 'month'))

  return sorted.map((h, i): SheetColumn => {
    const key = norm(h.name)
    if (i === monthIdx) return { ...h, kind: 'month' }
    if (NAMED_KINDS[key]) return { ...h, kind: NAMED_KINDS[key] }
    const isBeforeTotal = totalIdx === -1 ? i > monthIdx : i < totalIdx
    return { ...h, kind: isBeforeTotal && i > monthIdx ? 'category' : 'other' }
  })
}

// Built-in layout used until a sheet has been synced (matches the original hardcoded sheet)
export const DEFAULT_LAYOUT: SheetColumn[] = (() => {
  const names = [
    'Month', ...EXPENSE_CATEGORIES, 'Total Expenditure', 'Income',
    'Income After Expenditure', 'Gross Savings', 'Gross Investment', 'Net Income',
  ]
  return classifyHeaders(names.map((name, i) => ({ column: columnLetter(i), name })))
})()

export function getLayout(config: SheetConfig | null | undefined): SheetColumn[] {
  return config?.layout && config.layout.length > 0 ? config.layout : DEFAULT_LAYOUT
}

export function layoutCategories(layout: SheetColumn[]): string[] {
  return layout.filter(c => c.kind === 'category').map(c => categoryFromHeader(c.name))
}

/** Config fields derived from a layout, so mappings/formula columns never need hand-editing. */
export function configPartsFromLayout(layout: SheetColumn[]): Pick<
  SheetConfig,
  'categoryMappings' | 'constantColumns' | 'incomeColumn' | 'savingsColumn' | 'investmentColumn'
> {
  const categoryMappings: CategoryMapping[] = layout
    .filter(c => c.kind === 'category')
    .map(c => ({ appCategory: categoryFromHeader(c.name), sheetColumn: c.column }))
  const writable = new Set<SheetColumnKind>(['month', 'category', 'income', 'savings', 'investment'])
  return {
    categoryMappings,
    constantColumns: layout.filter(c => !writable.has(c.kind)).map(c => c.column),
    incomeColumn: layout.find(c => c.kind === 'income')?.column,
    savingsColumn: layout.find(c => c.kind === 'savings')?.column,
    investmentColumn: layout.find(c => c.kind === 'investment')?.column,
  }
}

export interface RowCell {
  column: string
  label: string
  kind: SheetColumnKind
  value: number | null // null = free text (month) or a column we don't fill
  text?: string
}

export interface BuiltRow {
  cells: RowCell[]
  totalExpenditure: number
  income: number
  incomeAfterExpenditure: number
  grossSavings: number
  grossInvestment: number
  netIncome: number
  // Spending in categories that have no column in the sheet
  unmapped: { category: string; total: number }[]
}

/** Builds the row in the sheet's own column order, including gaps, so it can be pasted as-is. */
export function buildSheetRow(transactions: Transaction[], layout: SheetColumn[], month: string): BuiltRow {
  const totals = new Map<string, number>()
  let income = 0
  let grossSavings = 0
  let grossInvestment = 0

  for (const tx of transactions) {
    if (tx.isExcluded) continue
    if (tx.type === 'income') {
      income += tx.amount
      continue
    }
    const category = tx.category || 'Other'
    if (category === 'Savings') grossSavings += tx.amount
    else if (category === 'Investment') grossInvestment += tx.amount
    else if (category !== 'Transfer') totals.set(category, (totals.get(category) || 0) + tx.amount)
  }

  const known = new Set(layoutCategories(layout))
  const unmapped = [...totals.entries()]
    .filter(([c]) => !known.has(c))
    .map(([category, total]) => ({ category, total }))

  // Only categories that have a column count toward Total Expenditure
  const totalExpenditure = [...totals.entries()].filter(([c]) => known.has(c)).reduce((s, [, v]) => s + v, 0)
  const incomeAfterExpenditure = income - totalExpenditure
  const netIncome = incomeAfterExpenditure - grossSavings - grossInvestment

  const byKind: Partial<Record<SheetColumnKind, number>> = {
    total: totalExpenditure,
    income,
    incomeAfter: incomeAfterExpenditure,
    savings: grossSavings,
    investment: grossInvestment,
    net: netIncome,
  }

  const cells: RowCell[] = []
  const last = layout.length ? columnIndex(layout[layout.length - 1].column) : -1
  const byLetter = new Map(layout.map(c => [c.column, c]))
  for (let i = 0; i <= last; i++) {
    const letter = columnLetter(i)
    const col = byLetter.get(letter)
    if (!col) {
      cells.push({ column: letter, label: '', kind: 'other', value: null })
    } else if (col.kind === 'month') {
      cells.push({ column: letter, label: col.name, kind: 'month', value: null, text: month })
    } else if (col.kind === 'category') {
      cells.push({ column: letter, label: col.name, kind: 'category', value: totals.get(categoryFromHeader(col.name)) || 0 })
    } else if (col.kind === 'other') {
      cells.push({ column: letter, label: col.name, kind: 'other', value: null })
    } else {
      cells.push({ column: letter, label: col.name, kind: col.kind, value: byKind[col.kind] ?? 0 })
    }
  }

  return { cells, totalExpenditure, income, incomeAfterExpenditure, grossSavings, grossInvestment, netIncome, unmapped }
}

/** Re-reads the sheet's header row and returns the config updated to match it. Throws if unreachable. */
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

/**
 * Credential-free way to learn the layout: the user copies the header row in Google Sheets
 * (cells come out tab-separated) and pastes it. Empty cells are kept so letters stay correct.
 * `startColumn` is the letter of the first copied cell (default A).
 */
export function layoutFromPaste(text: string, startColumn = 'A'): { layout: SheetColumn[]; headerRow: number } | null {
  const rows = text.replace(/\r/g, '').split('\n').map(r => r.split('\t').map(c => c.trim()))
  const filled = rows.filter(r => r.some(Boolean))
  if (filled.length === 0) return null
  // If several rows were pasted, prefer the one that has "Total Expenditure"; else the fullest
  const row =
    filled.find(r => r.some(c => norm(c) === 'totalexpenditure')) ??
    filled.reduce((best, r) => (r.filter(Boolean).length > best.filter(Boolean).length ? r : best))
  const start = Math.max(0, columnIndex((startColumn || 'A').toUpperCase()))
  const headers = row
    .map((name, i) => ({ column: columnLetter(start + i), name }))
    .filter(h => h.name)
  if (headers.length < 2) return null
  return { layout: classifyHeaders(headers), headerRow: 0 }
}
