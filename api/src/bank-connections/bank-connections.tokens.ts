import { BankingConfig } from './banking.config'

export const BANKING_CONFIG = Symbol('BANKING_CONFIG')
export const BANKING_STATE = Symbol('BANKING_STATE')
export type BankingState = 'off' | 'misconfigured'
export const CLOCK = Symbol('CLOCK')
export interface Clock {
  now(): Date
}
export type { BankingConfig }
