import { describe, expect, it, vi } from 'vitest'
import { TransactionHooks } from './transaction-hooks'

describe('transaction hooks', () => {
  it('tell every feature when a person’s transactions are erased, and only for that person', () => {
    const hooks = new TransactionHooks()
    const a = vi.fn<(userId: string) => void>()
    const b = vi.fn<(userId: string) => void>()

    hooks.onErased(a)
    hooks.onErased(b)
    hooks.erased('u1')
    expect(a).toHaveBeenCalledWith('u1')
    expect(b).toHaveBeenCalledWith('u1')
    expect(a).toHaveBeenCalledTimes(1)
  })

  it('combine what features add to a transaction, looked up for one person', () => {
    const hooks = new TransactionHooks()

    hooks.decorate(user => ref => ({ tripId: user === 'u1' && ref === 'r1' ? 't1' : null }))
    hooks.decorate(() => ref => ({ extra: `x-${ref}` }))
    expect(hooks.decorationsFor('u1')('r1')).toEqual({ tripId: 't1', extra: 'x-r1' })
    expect(hooks.decorationsFor('u2')('r1')).toEqual({ tripId: null, extra: 'x-r1' })
  })

  it('add nothing when no feature has registered', () => {
    expect(new TransactionHooks().decorationsFor('u')('r')).toEqual({})
  })
})
