import { describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { buildSheetRow, DEFAULT_LAYOUT } from '@/shared/utils/sheetLayout'
import { latestCompleteMonth, monthGroups, monthsTsv, monthTsv, yearGrid } from './sheetYear'

const tx = (date: string, amount: number, over: Partial<Transaction> = {}): Transaction =>
  ({
    id: `${date}-${amount}-${over.category}`,
    date,
    description: 'x',
    amount,
    currency: 'EUR',
    type: 'expense',
    category: 'Rent',
    rawData: {},
    ...over,
  }) as Transaction

const rows = [
  tx('2026-01-02', 3000, { type: 'income', category: 'Income' }),
  tx('2026-01-03', 1000),
  tx('2026-02-03', 1000),
  tx('2026-02-10', 200, { category: 'Investment' }),
  tx('2026-02-11', 90, { category: 'Transfer' }),
  tx('2026-02-12', 40, { isExcluded: true }),
]

describe('monthGroups', () => {
  it('groups by the month a payment counts in, oldest first', () => {
    const moved = tx('2026-02-28', 50, { countsToMonth: '2026-03' })

    expect(monthGroups([moved, ...rows]).map(m => [m.key, m.txs.length])).toEqual([
      ['2026-01', 2],
      ['2026-02', 4],
      ['2026-03', 1],
    ])
  })
})

describe('yearGrid', () => {
  it('gives each month the numbers the export row has, in the sheet’s order, and adds them up', () => {
    const months = monthGroups(rows)
    const grid = yearGrid(months, DEFAULT_LAYOUT)
    const february = buildSheetRow(months[1].txs, DEFAULT_LAYOUT, months[1].label)
    const col = (kind: string) => grid.columns.findIndex(c => c.kind === kind)

    expect(grid.rows[1].values[col('net')]).toBe(february.netIncome)
    expect(grid.rows[1].values[col('investment')]).toBe(200)
    expect(grid.totals[col('income')]).toBe(3000)
    expect(grid.totals[col('total')]).toBe(2000)
    expect(grid.columns.some(c => c.kind === 'month')).toBe(false)
  })

  it('lists spending your sheet has no column for, and keeps it out of the totals', () => {
    const grid = yearGrid(monthGroups([tx('2026-01-03', 70, { category: 'Pets' })]), DEFAULT_LAYOUT)

    expect(grid.unmapped).toEqual([{ category: 'Pets', total: 70 }])
    expect(grid.totals[grid.columns.findIndex(c => c.kind === 'total')]).toBe(0)
  })
})

describe('copying rows', () => {
  it('pastes a month as the sheet row Export used to give, month label first', () => {
    const [jan] = monthGroups(rows)
    const cells = monthTsv(jan, DEFAULT_LAYOUT).split('\t')

    expect(cells[0]).toBe('January 2026')
    expect(cells.length).toBe(buildSheetRow(jan.txs, DEFAULT_LAYOUT, jan.label).cells.length)
  })

  it('puts one month per line when copying several', () => {
    expect(monthsTsv(monthGroups(rows), DEFAULT_LAYOUT).split('\n')).toHaveLength(2)
  })
})

describe('latestCompleteMonth', () => {
  it('skips the month still in progress, and falls back to it when it is all there is', () => {
    const months = monthGroups(rows)

    expect(latestCompleteMonth(months, '2026-03')?.key).toBe('2026-02')
    expect(latestCompleteMonth(months, '2026-02')?.key).toBe('2026-01')
    expect(latestCompleteMonth(months.slice(0, 1), '2026-01')?.key).toBe('2026-01')
  })
})
