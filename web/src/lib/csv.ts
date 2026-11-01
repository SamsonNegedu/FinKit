import { Transaction } from '../types'

function cell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value)
  // Quote when needed, and defuse spreadsheet formulas (=, +, -, @ at the start)
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = ['date', 'type', 'amount', 'currency', 'category', 'merchant', 'recipient', 'description', 'excluded']
  const rows = transactions.map(t => [
    t.date, t.type, t.type === 'expense' ? -t.amount : t.amount, t.currency,
    t.category || '', t.merchant || '', t.recipient || '', t.description, t.isExcluded ? 'yes' : '',
  ])
  return [header, ...rows].map(r => r.map(cell).join(',')).join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
