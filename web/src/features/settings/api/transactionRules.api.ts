import { API_BASE, getHeaders } from '@/shared/services/http'
import type { RuleMatch, TransactionRule } from '@/shared/utils/categorizer'

export async function getTransactionRules(): Promise<TransactionRule[]> {
  try {
    const response = await fetch(`${API_BASE}/transaction-rules`, { headers: getHeaders(false) })

    // Without banking there is no such endpoint: no rules, not an error
    return response.ok ? (await response.json()).rules : []
  } catch {
    return []
  }
}

export async function createTransactionRule(match: RuleMatch, category: string): Promise<TransactionRule | null> {
  try {
    const response = await fetch(`${API_BASE}/transaction-rules`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ match, category }),
    })

    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

export async function deleteTransactionRule(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/transaction-rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    })

    return response.ok
  } catch {
    return false
  }
}
