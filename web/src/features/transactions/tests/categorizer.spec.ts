import { describe, it, expect } from 'vitest'
import { categorizeWithRules, setLearnedMappings } from '@/shared/utils/categorizer'
import { tx } from './testFixtures'

describe('learned rule matching', () => {
  it('matches whole words only', () => {
    setLearnedMappings([
      { merchant: 'rewe', category: 'Groceries' },
      { merchant: 'amazon prime', category: 'Subscriptions' },
    ])
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
