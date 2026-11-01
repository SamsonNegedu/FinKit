import type { SheetColumnKind, SheetColumn, Transaction } from '@/shared/types'
import { categoryFromHeader, columnIndex, columnLetter, layoutCategories } from './layoutCore'

export interface RowCell {
  column: string
  label: string
  kind: SheetColumnKind
  value: number | null
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
  unmapped: { category: string; total: number }[]
}

export function buildSheetRow(transactions: Transaction[], layout: SheetColumn[], month: string): BuiltRow {
  const totals = new Map<string, number>()
  let income = 0
  let grossSavings = 0
  let grossInvestment = 0

  for (const tx of transactions) {
    if (tx.isExcluded) {
      continue
    }
    if (tx.type === 'income') {
      income += tx.amount
      continue
    }
    const category = tx.category || 'Other'

    if (category === 'Savings') {
      grossSavings += tx.amount
    } else if (category === 'Investment') {
      grossInvestment += tx.amount
    } else if (category !== 'Transfer') {
      totals.set(category, (totals.get(category) || 0) + tx.amount)
    }
  }

  const known = new Set(layoutCategories(layout))
  const unmapped = [...totals.entries()]
    .filter(([c]) => !known.has(c))
    .map(([category, total]) => ({ category, total }))

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
      cells.push({
        column: letter,
        label: col.name,
        kind: 'category',
        value: totals.get(categoryFromHeader(col.name)) || 0,
      })
    } else if (col.kind === 'other') {
      cells.push({ column: letter, label: col.name, kind: 'other', value: null })
    } else {
      cells.push({ column: letter, label: col.name, kind: col.kind, value: byKind[col.kind] ?? 0 })
    }
  }

  return { cells, totalExpenditure, income, incomeAfterExpenditure, grossSavings, grossInvestment, netIncome, unmapped }
}
