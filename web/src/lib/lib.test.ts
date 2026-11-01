import { describe, it, expect } from 'vitest'
import { Transaction, RawTransaction } from '../types'
import { recategorize } from './recategorize'
import { classifyHeaders, layoutFromPaste, buildSheetRow, categoryFromHeader, columnLetter, DEFAULT_LAYOUT } from './sheetLayout'
import { mergeWithoutDuplicates } from './dedupe'
import { assignStableIds } from './ids'
import { categorizeWithRules, setLearnedMappings } from './categorizer'
import { transactionsToCsv } from './csv'

function tx(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    date: '2026-10-05', description: 'x', amount: 10, currency: 'EUR', type: 'expense', rawData: {},
    ...partial,
  } as Transaction
}

describe('recategorize', () => {
  const list = [
    tx({ id: '1', merchant: 'DeepSeek', category: 'Other' }),
    tx({ id: '2', merchant: 'DeepSeek', category: 'Other' }),
    tx({ id: '3', merchant: 'DeepSeek', category: 'Travel', categorySource: 'manual' }),
    tx({ id: '4', merchant: 'Shell', category: 'Other' }),
  ]

  it('applies to every non-manual row of the same merchant', () => {
    const r = recategorize(list, ['1'], 'Subscriptions')!
    expect(r.siblingCount).toBe(1)
    expect(r.next.map(t => t.category)).toEqual(['Subscriptions', 'Subscriptions', 'Travel', 'Other'])
    expect(r.next[0].categorySource).toBe('manual')
    expect(r.next[1].categorySource).toBe('learned')
  })

  it('never touches rows the user set by hand or other merchants', () => {
    const r = recategorize(list, ['1'], 'Subscriptions')!
    expect(r.next[2].category).toBe('Travel')
    expect(r.next[3].category).toBe('Other')
  })

  it('returns null for unknown ids', () => {
    expect(recategorize(list, ['nope'], 'Car')).toBeNull()
  })
})

describe('sheet layout', () => {
  const headers = ['Month', 'Rent', 'Car(Miles)', 'Gifts', 'New Macbook', 'Total Expenditure', 'Income', 'Income After Expenditure', 'Gross Savings', 'Gross Investment', 'Net Income']

  it('treats columns before Total Expenditure as categories, in order', () => {
    const layout = classifyHeaders(headers.map((name, i) => ({ column: columnLetter(i), name })))
    expect(layout.filter(c => c.kind === 'category').map(c => categoryFromHeader(c.name))).toEqual(['Rent', 'Car', 'Gifts', 'New Macbook'])
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
      'October 2026'
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

describe('dedupe + ids', () => {
  const raw = (description: string): RawTransaction => ({ date: '2026-10-01', description, amount: -5, currency: 'EUR', rawData: {} })

  it('skips rows already present but keeps genuine repeats', () => {
    const existing = [raw('coffee'), raw('coffee')]
    const { added, skipped, merged } = mergeWithoutDuplicates(existing, [raw('coffee'), raw('coffee'), raw('coffee'), raw('lunch')])
    expect(skipped).toBe(2)
    expect(added).toBe(2)
    expect(merged).toHaveLength(4)
  })

  it('gives the same ids when the same data is processed again', () => {
    const rows = [raw('a'), raw('a'), raw('b')]
    const make = () => rows.map((r, i) => tx({ id: String(i), description: r.description }))
    const ids1 = assignStableIds(make(), rows).map(t => t.id)
    const ids2 = assignStableIds(make(), rows).map(t => t.id)
    expect(ids1).toEqual(ids2)
    expect(new Set(ids1).size).toBe(3)
  })
})

describe('learned rule matching', () => {
  it('matches whole words only', () => {
    setLearnedMappings([{ merchant: 'rewe', category: 'Groceries' }, { merchant: 'amazon prime', category: 'Subscriptions' }])
    const [a, b, c] = categorizeWithRules([
      tx({ id: '1', description: 'REWE Markt 123', merchant: undefined }),
      tx({ id: '2', description: 'Reweaving Studio' }),
      tx({ id: '3', description: 'Amazon Prime Video' }),
    ])
    expect(a.category).toBe('Groceries')
    expect(b.category).not.toBe('Groceries')
    expect(c.category).toBe('Subscriptions')
    setLearnedMappings([])
  })
})

describe('csv', () => {
  it('quotes values and defuses formulas', () => {
    const csv = transactionsToCsv([tx({ id: '1', description: '=HYPERLINK("x")', merchant: 'A, B' })])
    expect(csv).toContain("\"'=HYPERLINK(\"\"x\"\")\"")
    expect(csv).toContain('"A, B"')
  })
})

import { applySplits, removeSplit, isValidSplit, remaining } from './splits'
import { applyRates, baseCurrencyOf, foreignCurrenciesOf } from './rates'
import { applyAliases, displayNameOf } from './aliases'

describe('splits', () => {
  const parent = tx({ id: 'p', amount: 100, merchant: 'Amazon', category: 'Shopping' })
  const parts = [{ amount: 60, category: 'Shopping' }, { amount: 40, category: 'Gifts' }]

  it('validates that parts add up to the total', () => {
    expect(isValidSplit(100, parts)).toBe(true)
    expect(isValidSplit(100, [{ amount: 60, category: 'A' }, { amount: 30, category: 'B' }])).toBe(false)
    expect(isValidSplit(100, [{ amount: 100, category: 'A' }])).toBe(false)
    expect(remaining(100, [{ amount: 33.33, category: 'A' }])).toBe(66.67)
  })

  it('replaces the parent by its parts and can restore it', () => {
    const split = applySplits([parent, tx({ id: 'o' })], { p: { parent, parts } })
    expect(split.map(t => t.id)).toEqual(['p~1', 'p~2', 'o'])
    expect(split[1]).toMatchObject({ amount: 40, category: 'Gifts', splitOf: 'p' })
    expect(removeSplit(split, 'p', parent).map(t => t.id)).toEqual(['p', 'o'])
  })

  it('does not learn or spread rules from split parts', () => {
    const list = applySplits([parent, tx({ id: 'q', merchant: 'Amazon', category: 'Other' })], { p: { parent, parts } })
    const r = recategorize(list, ['p~1'], 'Gifts')!
    expect(r.merchants).toEqual([])
    expect(r.siblingCount).toBe(0)
  })
})

describe('exchange rates', () => {
  const list = [tx({ id: '1', currency: 'EUR' }), tx({ id: '2', currency: 'EUR' }), tx({ id: '3', currency: 'USD', amount: 100 })]

  it('finds the base and foreign currencies', () => {
    expect(baseCurrencyOf(list)).toBe('EUR')
    expect(foreignCurrenciesOf(list, 'EUR')).toEqual(['USD'])
  })

  it('converts only when a rate is set and keeps the original', () => {
    expect(applyRates(list, 'EUR', {})[2].amount).toBe(100)
    const converted = applyRates(list, 'EUR', { USD: 0.9 })[2]
    expect(converted).toMatchObject({ amount: 90, currency: 'EUR', originalAmount: 100, originalCurrency: 'USD' })
  })
})

describe('aliases', () => {
  it('sets a display name without changing the merchant', () => {
    const [t] = applyAliases([tx({ id: '1', merchant: 'AMZN Mktp DE' })], { amzn_mktp_de: 'x', 'amzn mktp de': 'Amazon' })
    expect(t.displayName).toBe('Amazon')
    expect(t.merchant).toBe('AMZN Mktp DE')
    expect(displayNameOf(t)).toBe('Amazon')
  })
})
