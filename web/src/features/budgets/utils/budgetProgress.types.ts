export interface BudgetLimit {
  category: string
  currency: string
  amount: number
  /** Unspent money carries into the next month */
  rollover?: boolean
  /** The month ("2026-11") the budget began: carrying over counts from here */
  startsMonth?: string | null
}

export interface BudgetRow extends BudgetLimit {
  /** The limit set for each month. `amount` is this plus what was carried in */
  base: number
  /** Unspent money carried in from earlier months (0 unless rollover is on) */
  carried: number
  spent: number
  left: number
  /** Share of the limit used, uncapped so an overspend can be told from "exactly on budget" */
  used: number
  /** Where the month ends up if spending keeps its pace; null on the first day or when the month is over */
  projected: number | null
  /** How far through the month today is (0-1), for the "today" marker; null for a month that is over */
  paceAt: number | null
  state: 'ok' | 'watch' | 'over'
  /**
   * Money put away (Savings, Investment) is a target to reach, not a limit to stay under: it is never "over" or
   * "close", and it is left out of what is left to spend.
   */
  goal: boolean
}

export interface CapSummary {
  cap: number
  spent: number
  left: number
  used: number
  state: 'ok' | 'watch' | 'over'
}

export interface BudgetTotals {
  budgeted: number
  spent: number
  left: number
  over: number
  watch: number
}
