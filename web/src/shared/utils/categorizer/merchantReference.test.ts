import { afterEach, describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { merchantKeyOf, setLearnedMappings, stripReference } from './index'
import { findLearned } from './learnedMappings'
import { displayNameOf } from '../aliases'

afterEach(() => setLearnedMappings([]))

describe('order references on marketplace payees', () => {
  it.each([
    ['AMZN Mktp DE*BT7WM55K4', 'AMZN Mktp DE'],
    ['Amzn Mktp De*3o3c80x65 AMZN.COM/BILL', 'Amzn Mktp De'],
    ['GOOGLE *YouTube', 'GOOGLE *YouTube'],
    ['SumUp *Banh Mi Trang', 'SumUp *Banh Mi Trang'],
    ['SumUp *Shop2Go', 'SumUp *Shop2Go'],
    ['Aldi', 'Aldi'],
  ])('%s -> %s', (name, expected) => {
    expect(stripReference(name)).toBe(expected)
  })

  it('gives every purchase the same merchant, title and learned category', () => {
    const a = { recipient: 'AMZN Mktp DE*BT7WM55K4', description: 'AMZN Mktp DE*BT7WM55K4' }
    const b = { recipient: 'AMZN Mktp DE*NK8IZ4414', description: 'AMZN Mktp DE*NK8IZ4414' }

    expect(merchantKeyOf(a)).toBe(merchantKeyOf(b))
    expect(displayNameOf(a)).toBe('AMZN Mktp DE')
    setLearnedMappings([{ merchant: merchantKeyOf(a), category: 'Shopping' }])
    expect(findLearned(b as Transaction)?.category).toBe('Shopping')
  })
})
