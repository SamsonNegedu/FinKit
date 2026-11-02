import type { BudgetLimit } from '../utils/budgetProgress'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class BudgetsError extends Error {}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        // A header other websites cannot send: the server requires it on every changing request
        ...(init.method && init.method !== 'GET' ? { 'X-FinKit': '1' } : {}),
      },
      credentials: 'same-origin',
    })
  } catch {
    throw new BudgetsError("Couldn't reach FinKit's server.")
  }
  const body = res.status === 204 ? {} : await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new BudgetsError(typeof body.error === 'string' ? body.error : 'Something went wrong.')
  }

  return body as T
}

export interface BudgetCap {
  currency: string
  amount: number
}

export const listBudgets = () => call<{ budgets: BudgetLimit[]; caps: BudgetCap[] }>('/budgets')
export const saveBudget = (budget: BudgetLimit) =>
  call<BudgetLimit>('/budgets', { method: 'PUT', body: JSON.stringify(budget) })
export const deleteBudget = (b: Pick<BudgetLimit, 'category' | 'currency'>) =>
  call<unknown>(`/budgets/${b.currency}/${encodeURIComponent(b.category)}`, { method: 'DELETE' })
export const saveCap = (cap: BudgetCap) => call<BudgetCap>('/budget-cap', { method: 'PUT', body: JSON.stringify(cap) })
export const deleteCap = (currency: string) => call<unknown>(`/budget-cap/${currency}`, { method: 'DELETE' })
