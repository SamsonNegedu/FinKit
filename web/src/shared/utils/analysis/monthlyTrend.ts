import type { Transaction } from '@/shared/types'
import { analyze } from './analyze'
import { monthGroups } from './sheetYear'

export interface TrendMonth {
  /** "2026-03" */
  key: string
  year: number
  /** 0-11, as in Date */
  month: number
  /** "Mar 26" */
  label: string
  income: number
  spent: number
  /** Investments and savings: money kept, not spent */
  putAway: number
  /** What is left of income after spending and putting away; never below zero, a month that spent more shows as over */
  leftOver: number
  /** How much more went out than came in, when it did */
  over: number
}

/**
 * Where each month's income went: spent, put away, or left over. Months are the ones payments count in, so a
 * payment moved to another month is counted there. Worked out from the same numbers as the headline, not apart.
 */
export function monthlyTrend(transactions: Transaction[]): TrendMonth[] {
  return monthGroups(transactions).map(m => {
    const a = analyze(m.txs, null, 30)
    const putAway = a.invested + a.saved
    const balance = a.income - a.spent - putAway

    return {
      key: m.key,
      year: m.year,
      month: m.month,
      label: new Date(m.year, m.month, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: a.income,
      spent: a.spent,
      putAway,
      leftOver: Math.max(balance, 0),
      over: Math.max(-balance, 0),
    }
  })
}
