import { describe, it, expect } from 'vitest'
import {
  classifyHeaders,
  layoutFromPaste,
  buildSheetRow,
  categoryFromHeader,
  columnLetter,
  DEFAULT_LAYOUT,
} from '@/shared/utils/sheetLayout'
import { tx } from './testFixtures'

describe('sheet layout', () => {
  const headers = [
    'Month',
    'Rent',
    'Car(Miles)',
    'Gifts',
    'New Macbook',
    'Total Expenditure',
    'Income',
    'Income After Expenditure',
    'Gross Savings',
    'Gross Investment',
    'Net Income',
  ]

  it('treats columns before Total Expenditure as categories, in order', () => {
    const layout = classifyHeaders(headers.map((name, i) => ({ column: columnLetter(i), name })))

    expect(layout.filter(c => c.kind === 'category').map(c => categoryFromHeader(c.name))).toEqual([
      'Rent',
      'Car',
      'Gifts',
      'New Macbook',
    ])
    expect(layout.find(c => c.name === 'Income After Expenditure')!.kind).toBe('incomeAfter')
    expect(layout.find(c => c.name === 'Net Income')!.kind).toBe('net')
  })

  it('parses a pasted header row, keeping column letters', () => {
    const r = layoutFromPaste(headers.join('\t'), 'A')!

    expect(r.layout[0]).toMatchObject({ column: 'A', kind: 'month' })
    expect(r.layout.find(c => c.name === 'Gifts')!.column).toBe('D')
    const offset = layoutFromPaste(headers.join('\t'), 'B')!

    expect(offset.layout[0].column).toBe('B')
  })

  it('picks the header row when a banner row is pasted too', () => {
    const r = layoutFromPaste('ACTUAL EXPENSES\n' + headers.join('\t'), 'A')!

    expect(r.layout.some(c => c.name === 'Total Expenditure')).toBe(true)
  })

  it('builds a row in sheet order and reports spend with no column', () => {
    const layout = classifyHeaders(headers.map((name, i) => ({ column: columnLetter(i), name })))
    const row = buildSheetRow(
      [
        tx({ id: 'a', category: 'Rent', amount: 500 }),
        tx({ id: 'b', category: 'New Macbook', amount: 100 }),
        tx({ id: 'c', category: 'Shopping', amount: 40 }),
        tx({ id: 'd', type: 'income', amount: 2000, category: 'Income' }),
        tx({ id: 'e', category: 'Rent', amount: 999, isExcluded: true }),
      ],
      layout,
      'October 2026',
    )

    expect(row.cells.map(c => c.label)).toEqual(headers)
    expect(row.totalExpenditure).toBe(600)
    expect(row.income).toBe(2000)
    expect(row.netIncome).toBe(1400)
    expect(row.unmapped).toEqual([{ category: 'Shopping', total: 40 }])
  })

  it('has a usable default layout', () => {
    expect(DEFAULT_LAYOUT.find(c => c.kind === 'total')!.column).toBe('S')
  })
})
