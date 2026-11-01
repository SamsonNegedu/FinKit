import { describe, it, expect } from 'vitest'
import { recategorize } from '@/shared/utils/recategorize'
import { tx } from './testFixtures'

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
