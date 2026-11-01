import type { SheetColumn, SheetColumnKind, SheetConfig, CategoryMapping } from '@/shared/types'
import { EXPENSE_CATEGORIES } from '../categorizer'
import type { SheetHeaderColumn } from '@/features/export/api/export.api'

export function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

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

export function classifyHeaders(headers: SheetHeaderColumn[]): SheetColumn[] {
  const sorted = [...headers].sort((a, b) => columnIndex(a.column) - columnIndex(b.column))
  const totalIdx = sorted.findIndex(h => norm(h.name) === 'totalexpenditure')
  const monthIdx = Math.max(
    0,
    sorted.findIndex(h => norm(h.name) === 'month'),
  )

  return sorted.map((h, i): SheetColumn => {
    const key = norm(h.name)
    if (i === monthIdx) return { ...h, kind: 'month' }
    if (NAMED_KINDS[key]) return { ...h, kind: NAMED_KINDS[key] }
    const isBeforeTotal = totalIdx === -1 ? i > monthIdx : i < totalIdx
    return { ...h, kind: isBeforeTotal && i > monthIdx ? 'category' : 'other' }
  })
}

export const DEFAULT_LAYOUT: SheetColumn[] = (() => {
  const names = [
    'Month',
    ...EXPENSE_CATEGORIES,
    'Total Expenditure',
    'Income',
    'Income After Expenditure',
    'Gross Savings',
    'Gross Investment',
    'Net Income',
  ]
  return classifyHeaders(names.map((name, i) => ({ column: columnLetter(i), name })))
})()

export function getLayout(config: SheetConfig | null | undefined): SheetColumn[] {
  return config?.layout && config.layout.length > 0 ? config.layout : DEFAULT_LAYOUT
}

export function layoutCategories(layout: SheetColumn[]): string[] {
  return layout.filter(c => c.kind === 'category').map(c => categoryFromHeader(c.name))
}

export function configPartsFromLayout(
  layout: SheetColumn[],
): Pick<SheetConfig, 'categoryMappings' | 'constantColumns' | 'incomeColumn' | 'savingsColumn' | 'investmentColumn'> {
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
