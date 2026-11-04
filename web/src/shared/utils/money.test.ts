import { describe, expect, it } from 'vitest'
import { addMoney, fromMoneyMinor, moneyMinor, negateMoney, roundMoney, subtractMoney, sumMoney } from './money'

describe('moneyMinor', () => {
  it('rounds to cents', () => {
    expect(moneyMinor(10.005)).toBe(1001)
    expect(fromMoneyMinor(1001)).toBe(10.01)
  })
})

describe('sumMoney', () => {
  it('avoids binary float drift when adding many decimals', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(sumMoney([33.33, 33.33, 33.34])).toBe(100)
  })
})

describe('addMoney / subtractMoney / negateMoney', () => {
  it('combines amounts in cents', () => {
    expect(addMoney(10.01, 0.02)).toBe(10.03)
    expect(subtractMoney(10.03, 0.02)).toBe(10.01)
    expect(negateMoney(12.34)).toBe(-12.34)
    expect(roundMoney(9.999)).toBe(10)
  })
})
