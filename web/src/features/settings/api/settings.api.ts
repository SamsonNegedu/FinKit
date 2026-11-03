import { SheetConfig } from '@/shared/types'
import { API_BASE, getHeaders } from '@/shared/services/http'

export type { SheetHeaderColumn } from '@/features/export/api/export.api'

export interface LearnedMapping {
  merchant: string
  merchantDisplay?: string
  category: string
  detail?: string
  confidence: number
}

export async function getLearnedMappings(): Promise<LearnedMapping[]> {
  try {
    const response = await fetch(`${API_BASE}/learn/mappings`, {
      headers: getHeaders(false),
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()

    return result.data || []
  } catch {
    console.log('Learning API not available, using local categorization only')

    return []
  }
}

export async function saveLearnedMapping(merchant: string, category: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/learn/mapping`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ merchant, category }),
    })

    return response.ok
  } catch {
    return false
  }
}

export async function deleteLearnedMapping(merchant: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/learn/mapping/${encodeURIComponent(merchant)}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    })

    return response.ok
  } catch {
    return false
  }
}

export async function saveBatchLearnedMappings(
  mappings: Array<{ merchant: string; category: string; detail?: string }>,
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/learn/mappings/batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ mappings }),
    })

    return response.ok
  } catch {
    return false
  }
}

export async function getSheetConfig(): Promise<SheetConfig | null> {
  try {
    const response = await fetch(`${API_BASE}/settings/sheet`, {
      headers: getHeaders(false),
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()

    return result.data || null
  } catch {
    console.log('Settings API not available')

    return null
  }
}

export async function saveSheetConfig(config: SheetConfig): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/settings/sheet`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(config),
    })

    return response.ok
  } catch {
    console.log('Failed to save settings')

    return false
  }
}

export type { CategoryList } from '@/shared/utils/categorizer/categoryList'
import type { CategoryList } from '@/shared/utils/categorizer/categoryList'

/** The person's own categories, or null until they have saved a list. */
export async function getCategoryList(): Promise<CategoryList | null> {
  try {
    const response = await fetch(`${API_BASE}/settings/categories`, { headers: getHeaders(false) })

    if (!response.ok) {
      return null
    }

    return (await response.json()).data ?? null
  } catch {
    return null
  }
}

export async function saveCategoryList(list: CategoryList): Promise<CategoryList> {
  const response = await fetch(`${API_BASE}/settings/categories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(list),
  })

  if (!response.ok) {
    throw new Error("Couldn't save the categories.")
  }

  return (await response.json()).data
}
