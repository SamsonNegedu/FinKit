import { API_BASE, getHeaders } from '@/shared/services/http'

export interface SheetHeaderColumn {
  column: string
  name: string
}

export interface SheetTab {
  title: string
  index: number
}

export function extractSheetId(input: string): string {
  if (input.includes('docs.google.com/spreadsheets')) {
    const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/)

    if (match) {
      return match[1]
    }
  }

  return input.trim()
}

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

  if (!response.ok) {
    throw new Error(result.error || 'Failed to read the sheet')
  }

  return result.data
}

export async function fetchSheetMetadata(sheetId: string): Promise<SheetTab[]> {
  const response = await fetch(`${API_BASE}/export/sheets/metadata`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sheetId }),
  })
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch sheet info')
  }

  return result.data?.sheets || []
}
