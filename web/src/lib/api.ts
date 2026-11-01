import { SheetConfig } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Headers helper
function getHeaders(contentType = true): HeadersInit {
  const headers: HeadersInit = {}
  if (contentType) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

export interface SheetHeaderColumn {
  column: string
  name: string
}

// Read the header row of a sheet tab (so the app mirrors the sheet instead of hardcoding columns)
export async function fetchSheetLayout(
  sheetId: string,
  tabName: string,
): Promise<{ headerRow: number; columns: SheetHeaderColumn[] }> {
  const response = await fetch(`${API_BASE}/export/sheets/layout`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sheetId, tabName }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Failed to read the sheet')
  return result.data
}

// ============ Learning API ============

export interface LearnedMapping {
  merchant: string
  merchantDisplay?: string
  category: string
  confidence: number
}

// Fetch all learned merchant → category mappings
export async function getLearnedMappings(): Promise<LearnedMapping[]> {
  try {
    const response = await fetch(`${API_BASE}/learn/mappings`, {
      headers: getHeaders(false),
    })
    if (!response.ok) return []

    const result = await response.json()
    return result.data || []
  } catch {
    // API might not be available, return empty
    console.log('Learning API not available, using local categorization only')
    return []
  }
}

// Save a merchant → category mapping (called when user manually recategorizes)
// Returns true when the server confirmed the save
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

// Remove a learned mapping (used by undo)
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

// Save multiple mappings at once
export async function saveBatchLearnedMappings(
  mappings: Array<{ merchant: string; category: string }>,
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

// ============ Settings API ============

// Fetch sheet configuration (with server-side defaults as fallback)
export async function getSheetConfig(): Promise<SheetConfig | null> {
  try {
    const response = await fetch(`${API_BASE}/settings/sheet`, {
      headers: getHeaders(false),
    })
    if (!response.ok) return null

    const result = await response.json()
    return result.data || null
  } catch {
    console.log('Settings API not available')
    return null
  }
}

// Save sheet configuration to server
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
