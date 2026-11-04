import { ApiError, apiJson, jsonRequest } from '@/shared/services/apiClient'

export type Frequency = 'monthly' | 'quarterly' | 'yearly'
export type ContractState = 'detected' | 'confirmed' | 'dismissed' | 'manual'

export interface Contract {
  id: string
  state: ContractState
  currency: string
  name: string
  /** The payee as the bank names it (null for contracts you added), used to find its transactions */
  payee: string | null
  /** One of your categories */
  group: string
  /** you: chosen by hand. rule: from your merchant rules. suggested: a guess. none: nothing to go on. */
  groupSource: 'you' | 'rule' | 'suggested' | 'none'
  /** Fixed: the same every time. Variable: regular but drifting (electricity). */
  kind: 'fixed' | 'variable'
  frequency: Frequency
  amount: number
  /** What it costs per month: quarterly and yearly payments are spread out */
  monthly: number
  lastAmount: number | null
  firstDate: string | null
  lastDate: string | null
  nextExpected: string | null
  count: number
  /** False when the latest payment is overdue: cancelled, or paid from somewhere else now */
  active: boolean
  priceChange: { from: number; to: number } | null
  note: string | null
  /** Made from payments you picked: they can be taken out again */
  linked: boolean
  kmPerYear: number | null
  costPerKm: number | null
  foundAt: string | null
  /** Found after the first batch, in the last two weeks */
  isNew: boolean
}
export interface ContractTotals {
  currency: string
  monthly: number
  fixed: number
  variable: number
  byGroup: Record<string, number>
}
export interface ContractsResult {
  contracts: Contract[]
  totals: ContractTotals[]
}
export interface NewContract {
  name: string
  group: string
  amount: number
  currency: string
  frequency: Frequency
  kind: 'fixed' | 'variable'
  /** The latest payment: where "next due" counts on from */
  startDate?: string | null
  note?: string
  kmPerYear?: number
}
/** A contract made from synced payments picked in the transaction list */
export interface NewContractFromPayments {
  name: string
  group: string
  amount: number
  frequency: Frequency
  kind: 'fixed' | 'variable'
  note?: string
  refs: string[]
}
/** `null` clears what was set before. */
export interface ContractChanges {
  state?: 'detected' | 'confirmed' | 'dismissed'
  name?: string | null
  group?: string | null
  note?: string | null
  kmPerYear?: number | null
  /** Only for contracts you added */
  amount?: number
  frequency?: Frequency
  kind?: 'fixed' | 'variable'
  /** Payments to take out of a contract made from picked payments */
  unlink?: string[]
}

export interface ContractPayment {
  ref: string
  date: string
  amount: number
  description: string
}

export class ContractsError extends ApiError {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await apiJson<T>(path, init)
  } catch (e) {
    if (e instanceof ApiError) {
      throw new ContractsError(e.message)
    }

    throw e
  }
}

export const listContracts = () => call<ContractsResult>('/contracts')
export const createContract = (input: NewContract) => call<Contract>('/contracts', jsonRequest('POST', input))
export const createContractFromPayments = (input: NewContractFromPayments) =>
  call<Contract>('/contracts/from-payments', jsonRequest('POST', input))
export const updateContract = (id: string, changes: ContractChanges) =>
  call<Contract>(`/contracts/${id}`, jsonRequest('PATCH', changes))
export const deleteContract = (id: string) => call<unknown>(`/contracts/${id}`, jsonRequest('DELETE'))
export const listPayments = (id: string) =>
  call<{ payments: ContractPayment[] }>(`/contracts/${id}/payments`).then(r => r.payments)
