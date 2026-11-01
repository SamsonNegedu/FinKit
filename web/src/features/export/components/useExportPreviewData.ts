import { useMemo, useState } from 'react'
import { Transaction, SheetConfig } from '@/shared/types'
import { buildSheetRow, getLayout } from '@/shared/utils/sheetLayout'
import { parseLocalDate } from '@/shared/utils/dates'

export function useExportPreviewData(transactions: Transaction[], sheetConfig?: SheetConfig | null) {
  const months = useMemo(() => {
    const byMonth = new Map<string, { label: string; txs: Transaction[] }>()

    for (const tx of transactions) {
      const d = parseLocalDate(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry = byMonth.get(key) ?? {
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        txs: [],
      }

      entry.txs.push(tx)
      byMonth.set(key, entry)
    }

    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ key, ...v }))
  }, [transactions])

  const years = useMemo(() => [...new Set(months.map(m => Number(m.key.slice(0, 4))))].sort((a, b) => b - a), [months])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const activeYear = selectedYear ?? (selectedKey ? Number(selectedKey.slice(0, 4)) : years[0])
  const yearMonths = months.filter(m => Number(m.key.slice(0, 4)) === activeYear)
  const activeMonth = yearMonths.find(m => m.key === selectedKey) ?? yearMonths[yearMonths.length - 1]
  const month = activeMonth?.label ?? ''

  const layout = getLayout(sheetConfig)
  const previewData = useMemo(() => buildSheetRow(activeMonth?.txs ?? [], layout, month), [activeMonth, layout, month])
  const allRows = useMemo(() => yearMonths.map(m => buildSheetRow(m.txs, layout, m.label)), [yearMonths, layout])

  return {
    years,
    yearMonths,
    activeYear,
    activeMonth,
    month,
    previewData,
    allRows,
    sheetTabName: sheetConfig?.tabName,
    setSelectedKey,
    setSelectedYear,
  }
}
