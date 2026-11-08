import { afterEach, describe, expect, it } from 'vitest'
import { categorizeWithRules } from './categorizeWithRules'
import { setLearnedMappings } from './learnedMappings'
import { findRule, setTransactionRules, suggestRule } from './transactionRules'

afterEach(() => {
  setTransactionRules([])
  setLearnedMappings([])
})

const plan = {
  recipient: 'Aldi',
  description: 'Gebuehr fuer Kombi-Paket S (5G) fuer Ihr Prepaid-Konto 49157123',
  amount: 8.99,
}
const groceries = { recipient: 'Aldi', description: 'Kartenzahlung ALDI SAGT DANKE 4711', amount: 23.4 }

describe('transaction rules', () => {
  it('separates a phone plan from groceries at the same merchant', () => {
    setTransactionRules([
      { id: '1', category: 'Internet', match: { payee: 'Aldi', words: ['Prepaid-Konto'], amount: 8.99 } },
    ])

    expect(findRule(plan)?.category).toBe('Internet')
    expect(findRule(groceries)).toBeNull()
  })

  it('prefers the rule with more conditions, then the newer one', () => {
    setTransactionRules([
      { id: '1', category: 'Groceries', match: { payee: 'Aldi' } },
      { id: '2', category: 'Internet', match: { payee: 'Aldi', words: ['Prepaid-Konto'] } },
      { id: '3', category: 'Phone', match: { payee: 'Aldi', words: ['Prepaid-Konto'] } },
    ])

    expect(findRule(plan)?.category).toBe('Phone')
    expect(findRule(groceries)?.category).toBe('Groceries')
  })

  it('carries the subcategory of a rule', () => {
    setTransactionRules([{ id: '1', category: 'Car', detail: 'Miles', match: { payee: 'Aldi' } }])

    expect(findRule(plan)?.detail).toBe('Miles')
  })

  it('ignores the sign of the amount and rounding noise', () => {
    setTransactionRules([{ id: '1', category: 'Internet', match: { amount: 8.99 } }])

    expect(findRule({ ...plan, amount: -8.990000001 })?.category).toBe('Internet')
    expect(findRule({ ...plan, amount: 9.99 })).toBeNull()
  })

  it('beats the built-in Aldi rule when categorizing', () => {
    setTransactionRules([{ id: '1', category: 'Internet', match: { payee: 'Aldi', words: ['Prepaid-Konto'] } }])
    const base = { id: 'a', date: '2026-08-12', currency: 'EUR', type: 'expense', rawData: {} } as const
    const [p, g] = categorizeWithRules([{ ...base, ...plan } as never, { ...base, id: 'b', ...groceries } as never])

    expect(p.category).toBe('Internet')
    expect(g.category).toBe('Groceries')
  })

  it('keeps the merchant rule’s subcategory when a custom rule agrees on the category', () => {
    setLearnedMappings([{ merchant: 'Aldi', category: 'Internet', detail: 'Phone plan' }])
    setTransactionRules([{ id: '1', category: 'Internet', match: { payee: 'Aldi', words: ['Prepaid-Konto'] } }])
    const base = { id: 'a', date: '2026-08-12', currency: 'EUR', type: 'expense', rawData: {} } as const
    const [p] = categorizeWithRules([{ ...base, ...plan } as never])

    expect(p.category).toBe('Internet')
    expect(p.categoryDetail).toBe('Phone plan')
  })

  it('drops the merchant subcategory when a custom rule picks another category', () => {
    setLearnedMappings([{ merchant: 'Aldi', category: 'Groceries', detail: 'Fruit' }])
    setTransactionRules([{ id: '1', category: 'Internet', match: { payee: 'Aldi' } }])
    const base = { id: 'a', date: '2026-08-12', currency: 'EUR', type: 'expense', rawData: {} } as const
    const [p] = categorizeWithRules([{ ...base, ...plan } as never])

    expect(p.category).toBe('Internet')
    expect(p.categoryDetail).toBeUndefined()
  })

  it('suggests the payee, distinctive words and the amount', () => {
    expect(suggestRule(plan)).toEqual({
      payee: 'Aldi',
      words: ['Gebuehr', 'Kombi-Paket', 'Prepaid-Konto'],
      amount: 8.99,
      iban: '',
    })
  })

  it('matches the other account whatever the spacing or case', () => {
    const credit = {
      recipient: 'Me',
      recipientIban: 'de89 3704 0044 0532 0130 00',
      description: 'Umbuchung',
      amount: 200,
    }

    setTransactionRules([{ id: '1', category: 'Savings', match: { iban: 'DE89370400440532013000' } }])

    expect(findRule(credit)?.category).toBe('Savings')
    expect(findRule({ ...credit, recipientIban: 'DE00000000000000000000' })).toBeNull()
    expect(findRule({ ...credit, recipientIban: undefined })).toBeNull()
  })

  it('lets a rule turn a transfer into Savings, but leaves other transfers alone', () => {
    const base = { date: '2026-01-01', currency: 'EUR', rawData: {}, id: 'a', amount: 200, isTransfer: true }
    const own = { ...base, description: 'Umbuchung', recipientIban: 'DE89370400440532013000' }
    const other = { ...base, id: 'b', description: 'Umbuchung', recipientIban: 'DE00000000000000000000' }

    setTransactionRules([{ id: '1', category: 'Savings', match: { iban: 'DE89370400440532013000' } }])

    const [a, b] = categorizeWithRules([own, other] as never)

    expect(a.category).toBe('Savings')
    expect(b.category).toBe('Transfer')
  })
})
