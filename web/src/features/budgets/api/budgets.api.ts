import { ApiError, apiJson, jsonRequest } from '@/shared/services/apiClient'
import type { BudgetLimit } from '../utils/budgetProgress'

export class BudgetsError extends ApiError {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await apiJson<T>(path, init)
  } catch (e) {
    if (e instanceof ApiError) {
      throw new BudgetsError(e.message)
    }

    throw e
  }
}

export interface BudgetCap {
  currency: string
  amount: number
}

export const listBudgets = () => call<{ budgets: BudgetLimit[]; caps: BudgetCap[] }>('/budgets')
export const saveBudget = (budget: BudgetLimit) => call<BudgetLimit>('/budgets', jsonRequest('PUT', budget))
export const deleteBudget = (b: Pick<BudgetLimit, 'category' | 'currency'>) =>
  call<unknown>(`/budgets/${encodeURIComponent(b.currency)}/${encodeURIComponent(b.category)}`, jsonRequest('DELETE'))
export const saveCap = (cap: BudgetCap) => call<BudgetCap>('/budgets/caps', jsonRequest('PUT', cap))
export const deleteCap = (currency: string) =>
  call<unknown>(`/budgets/caps/${encodeURIComponent(currency)}`, jsonRequest('DELETE'))
