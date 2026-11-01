import { Injectable } from '@nestjs/common'
import { google, sheets_v4 } from 'googleapis'
import { quoteSheetTabName } from './a1'

interface CategoryValue {
  column: string
  value: number
}

interface ExportData {
  sheetId: string
  tabName: string
  month: string
  monthFormat: 'short' | 'long' | 'numeric'
  categoryValues: CategoryValue[]
  income: number
  savings?: number
  investment?: number
  constantColumns?: string[]
  incomeColumn?: string
  savingsColumn?: string
  investmentColumn?: string
}

interface ExportResult {
  success: boolean
  updatedCells: number
  rowNumber: number
}

// Fallbacks used only when the caller doesn't say which columns hold these values.
// Category columns are never hardcoded: they come from the request (read from the sheet header row).
const DEFAULT_INCOME_COLUMN = 'T'
const DEFAULT_SAVINGS_COLUMN = 'V'
const DEFAULT_INVESTMENT_COLUMN = 'W'

async function getAuthClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH

  if (!keyPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_PATH not configured')
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return auth.getClient()
}

async function findMonthRow(
  sheets: sheets_v4.Sheets,
  sheetId: string,
  tabName: string,
  month: string,
): Promise<number> {
  // Get column A (month column) data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${quoteSheetTabName(tabName)}!A:A`,
  })

  const values = response.data.values || []
  const monthLower = month.toLowerCase()

  // Find matching month row
  // Matches: "July 2025", "Jul 2025", "07/2025", etc.
  for (let i = 0; i < values.length; i++) {
    const cellValue = values[i]?.[0]?.toString().toLowerCase()

    if (!cellValue) {
      continue
    }

    // Check for exact match or partial match
    if (cellValue === monthLower || cellValue.includes(monthLower)) {
      return i + 1 // 1-indexed row number
    }

    // Also try matching just the month name
    const monthName = month.split(' ')[0]?.toLowerCase()

    if (monthName && cellValue.includes(monthName)) {
      // Verify year matches if present
      const year = month.split(' ')[1]

      if (!year || cellValue.includes(year)) {
        return i + 1
      }
    }
  }

  throw new Error(`Month "${month}" not found in sheet. Please ensure the row exists in column A.`)
}

async function writeRow(data: ExportData): Promise<ExportResult> {
  const authClient = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth: authClient as any })

  const tab = quoteSheetTabName(data.tabName)

  // Find the row for the specified month
  const rowNumber = await findMonthRow(sheets, data.sheetId, data.tabName, data.month)

  // Prepare batch update data
  const updateData: sheets_v4.Schema$ValueRange[] = []
  const constantCols = new Set(data.constantColumns || ['S', 'U', 'X']) // Default: skip formula columns

  // Category values (columns come from the sheet's header row)
  for (const { column, value } of data.categoryValues) {
    // Skip constant/formula columns
    if (constantCols.has(column)) {
      continue
    }

    updateData.push({
      range: `${tab}!${column}${rowNumber}`,
      values: [[value]],
    })
  }

  const incomeColumn = data.incomeColumn || DEFAULT_INCOME_COLUMN
  const savingsColumn = data.savingsColumn || DEFAULT_SAVINGS_COLUMN
  const investmentColumn = data.investmentColumn || DEFAULT_INVESTMENT_COLUMN

  if (!constantCols.has(incomeColumn)) {
    updateData.push({
      range: `${tab}!${incomeColumn}${rowNumber}`,
      values: [[data.income]],
    })
  }

  if (data.savings !== undefined && !constantCols.has(savingsColumn)) {
    updateData.push({
      range: `${tab}!${savingsColumn}${rowNumber}`,
      values: [[data.savings]],
    })
  }

  if (data.investment !== undefined && !constantCols.has(investmentColumn)) {
    updateData.push({
      range: `${tab}!${investmentColumn}${rowNumber}`,
      values: [[data.investment]],
    })
  }

  if (updateData.length === 0) {
    return {
      success: true,
      updatedCells: 0,
      rowNumber,
    }
  }

  // Execute batch update
  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: data.sheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updateData,
    },
  })

  return {
    success: true,
    updatedCells: response.data.totalUpdatedCells || 0,
    rowNumber,
  }
}

async function readMetadata(sheetId: string) {
  const authClient = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth: authClient as any })

  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  })

  return {
    title: response.data.properties?.title,
    sheets: response.data.sheets?.map(s => ({
      title: s.properties?.title,
      index: s.properties?.index,
    })),
  }
}

function columnLetter(index: number): string {
  let n = index + 1
  let out = ''

  while (n > 0) {
    const rem = (n - 1) % 26

    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }

  return out
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

interface SheetHeaderColumn {
  column: string
  name: string
}

interface SheetLayoutResult {
  headerRow: number // 1-indexed
  columns: SheetHeaderColumn[]
}

/**
 * Read the header row of a tab so the app can mirror the sheet instead of hardcoding columns.
 * Sheets often have a banner above the headers ("ACTUAL EXPENSES"), so we look through the
 * first rows for the one that contains "Total Expenditure", falling back to the fullest row.
 */
async function readLayout(sheetId: string, tabName: string): Promise<SheetLayoutResult> {
  const authClient = await getAuthClient()
  const sheets = google.sheets({ version: 'v4', auth: authClient as any })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${quoteSheetTabName(tabName)}!A1:ZZ10`,
  })

  const rows = (response.data.values || []).map(r => r.map((c: unknown) => (c ?? '').toString().trim()))

  if (rows.length === 0) {
    throw new Error(`Tab "${tabName}" is empty.`)
  }

  let headerIndex = rows.findIndex(r => r.some(c => normalizeHeader(c) === 'totalexpenditure'))

  if (headerIndex === -1) {
    let best = -1

    rows.forEach((r, i) => {
      const filled = r.filter(Boolean).length

      if (filled > best) {
        best = filled
        headerIndex = i
      }
    })
  }

  const columns = rows[headerIndex].map((name, i) => ({ column: columnLetter(i), name })).filter(c => c.name)

  return { headerRow: headerIndex + 1, columns }
}

/** Talks to Google Sheets with a service account (optional: the export screen can also just copy a row). */
@Injectable()
export class GoogleSheetsService {
  exportRow(data: ExportData): Promise<ExportResult> {
    return writeRow(data)
  }

  metadata(sheetId: string) {
    return readMetadata(sheetId)
  }

  layout(sheetId: string, tabName: string): Promise<SheetLayoutResult> {
    return readLayout(sheetId, tabName)
  }
}
