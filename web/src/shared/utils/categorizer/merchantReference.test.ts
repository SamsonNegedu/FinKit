import { afterEach, describe, expect, it } from 'vitest'
import type { Transaction } from '@/shared/types'
import { cleanPayee, merchantKeyOf, referenceTokens, setLearnedMappings, setReferenceTokens } from './index'
import { findLearned } from './learnedMappings'
import { withoutReferences } from './merchantReferences'
import { displayNameOf } from '../aliases'

type Row = { recipient?: string; description: string }
const learn = (rows: Row[]) =>
  setReferenceTokens(referenceTokens(rows.map(r => `${r.recipient ?? ''} ${r.description}`)))

afterEach(() => {
  setLearnedMappings([])
  setReferenceTokens(new Set())
})

describe('references are learned from what never repeats', () => {
  it('keeps a token that comes back and drops one that does not', () => {
    const refs = referenceTokens(['Shop2Go A1B2C3D4', 'Shop2Go E5F6G7H8', 'Shop2Go I9J1K2L3'])

    expect(refs.has('Shop2Go')).toBe(false)
    expect(refs.has('A1B2C3D4')).toBe(true)
  })

  it('does not leave a name with almost nothing', () => {
    expect(withoutReferences('7-11', new Set(['7-11']))).toBe('7-11')
  })

  it('gives every Amazon order the same merchant, title and learned category', () => {
    const a = { recipient: 'AMZN Mktp DE*BT7WM55K4', description: 'AMZN Mktp DE*BT7WM55K4' }
    const b = { recipient: 'AMZN Mktp DE*NK8IZ4414', description: 'AMZN Mktp DE*NK8IZ4414' }

    learn([a, b])
    expect(merchantKeyOf(a)).toBe(merchantKeyOf(b))
    expect(displayNameOf(a)).toBe('AMZN Mktp DE')
    expect(cleanPayee('GOOGLE *YouTube')).toBe('GOOGLE *YouTube')
    setLearnedMappings([{ merchant: merchantKeyOf(a), category: 'Shopping' }])
    expect(findLearned(b as Transaction)?.category).toBe('Shopping')
  })

  it('keeps a shop with a digit in its name once it has been visited twice', () => {
    const rows = [
      { recipient: 'SumUp *Shop2Go', description: 'SumUp *Shop2Go' },
      { recipient: 'SumUp *Shop2Go', description: 'SumUp *Shop2Go' },
    ]

    learn(rows)
    expect(merchantKeyOf(rows[0])).toBe('SumUp *Shop2Go')
  })

  it('keys payments without a payee the same when only a code changes', () => {
    const rows = ['603114414455', '604914061623'].map(id => ({ description: `S/836670615631/${id} Strom Abschlag` }))

    learn(rows)
    expect(merchantKeyOf(rows[0])).toBe(merchantKeyOf(rows[1]))
  })
})
