import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { RawTransaction } from '../types'

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  csv: ['.csv', 'text/csv', 'application/csv'],
  excel: ['.xlsx', '.xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
  ofx: ['.ofx', '.qfx', 'application/x-ofx'],
}

export function getSupportedExtensions(): string {
  return '.csv, .xlsx, .xls, .ofx, .qfx'
}

export function isFileSupported(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const type = file.type.toLowerCase()
  
  return Object.values(SUPPORTED_FILE_TYPES).some(types => 
    types.some(t => t === ext || t === type)
  )
}

export function getFileType(file: File): 'csv' | 'excel' | 'ofx' | 'unknown' {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const type = file.type.toLowerCase()
  
  if (SUPPORTED_FILE_TYPES.csv.some(t => t === ext || t === type)) return 'csv'
  if (SUPPORTED_FILE_TYPES.excel.some(t => t === ext || t === type)) return 'excel'
  if (SUPPORTED_FILE_TYPES.ofx.some(t => t === ext || t === type)) return 'ofx'
  
  return 'unknown'
}

// Finanzguru export columns
const FINANZGURU_COLUMNS: Record<string, keyof RawTransaction | string> = {
  'Buchungstag': 'date',
  'Referenzkonto': 'referenceAccount',
  'Name Referenzkonto': 'referenceAccountName',
  'Betrag': 'amount',
  'Kontostand': 'balance',
  'Waehrung': 'currency',
  'Währung': 'currency',
  'Beguenstigter/Auftraggeber': 'recipient',
  'Begünstigter/Auftraggeber': 'recipient',
  'IBAN Beguenstigter/Auftraggeber': 'recipientIban',
  'IBAN Begünstigter/Auftraggeber': 'recipientIban',
  'Verwendungszweck': 'description',
  'Analyse-Hauptkategorie': 'category',
  'Analyse-Unterkategorie': 'subcategory',
  'Analyse-Umbuchung': 'isTransfer',
}

// N26 CSV export columns (both German and English versions)
const N26_COLUMNS: Record<string, keyof RawTransaction | string> = {
  // German N26
  'Datum': 'date',
  'Empfänger': 'recipient',
  'Kontonummer': 'recipientIban',
  'Transaktionstyp': 'category',
  'Verwendungszweck': 'description',
  'Betrag (EUR)': 'amount',
  'Betrag (Fremdwährung)': 'foreignAmount',
  'Fremdwährung': 'foreignCurrency',
  'Wechselkurs': 'exchangeRate',
  // English N26
  'Date': 'date',
  'Payee': 'recipient',
  'Account number': 'recipientIban',
  'Transaction type': 'category',
  'Payment reference': 'description',
  'Amount (EUR)': 'amount',
  'Amount (Foreign Currency)': 'foreignAmount',
  'Type Foreign Currency': 'foreignCurrency',
  'Exchange Rate': 'exchangeRate',
}

// DKB CSV export columns
const DKB_COLUMNS: Record<string, keyof RawTransaction | string> = {
  'Buchungstag': 'date',
  'Wertstellung': 'valueDate',
  'Buchungstext': 'category',
  'Auftraggeber / Begünstigter': 'recipient',
  'Verwendungszweck': 'description',
  'Kontonummer': 'recipientIban',
  'BLZ': 'bankCode',
  'Betrag (EUR)': 'amount',
  'Gläubiger-ID': 'creditorId',
  'Mandatsreferenz': 'mandateRef',
  'Kundenreferenz': 'customerRef',
}

// ING-DiBa CSV export columns
const ING_COLUMNS: Record<string, keyof RawTransaction | string> = {
  'Buchung': 'date',
  'Valuta': 'valueDate',
  'Auftraggeber/Empfänger': 'recipient',
  'Buchungstext': 'category',
  'Verwendungszweck': 'description',
  'Saldo': 'balance',
  'Währung': 'currency',
  'Betrag': 'amount',
}

// Sparkasse/generic German bank columns
const SPARKASSE_COLUMNS: Record<string, keyof RawTransaction | string> = {
  'Buchungstag': 'date',
  'Valutadatum': 'valueDate',
  'Buchungstext': 'category',
  'Verwendungszweck': 'description',
  'Beguenstigter/Zahlungspflichtiger': 'recipient',
  'Kontonummer': 'recipientIban',
  'BLZ': 'bankCode',
  'Betrag': 'amount',
  'Waehrung': 'currency',
}

// Generic English column mappings (fallback)
const ENGLISH_COLUMNS: Record<string, keyof RawTransaction | string> = {
  'Date': 'date',
  'Booking Date': 'date',
  'Transaction Date': 'date',
  'Value Date': 'valueDate',
  'Amount': 'amount',
  'Currency': 'currency',
  'Description': 'description',
  'Recipient': 'recipient',
  'Payee': 'recipient',
  'IBAN': 'recipientIban',
  'Category': 'category',
  'Reference': 'referenceAccount',
  'Memo': 'description',
  'Notes': 'description',
}

// Combine all column mappings (order matters - more specific first)
const ALL_COLUMN_MAPPINGS = [
  FINANZGURU_COLUMNS,
  N26_COLUMNS,
  DKB_COLUMNS,
  ING_COLUMNS,
  SPARKASSE_COLUMNS,
  ENGLISH_COLUMNS,
]

function normalizeColumnName(header: string): string {
  // Try each mapping in order
  for (const mapping of ALL_COLUMN_MAPPINGS) {
    if (header in mapping) {
      return mapping[header] as string
    }
  }
  
  // Return lowercase version as fallback
  return header.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

// Detect which bank format was used
export function detectBankFormat(headers: string[]): string {
  const headerSet = new Set(headers)
  
  if (headerSet.has('Analyse-Hauptkategorie') || headerSet.has('Name Referenzkonto')) {
    return 'Finanzguru'
  }
  if (headerSet.has('Betrag (EUR)') || headerSet.has('Amount (EUR)')) {
    return 'N26'
  }
  if (headerSet.has('Gläubiger-ID') || headerSet.has('Mandatsreferenz')) {
    return 'DKB'
  }
  if (headerSet.has('Auftraggeber/Empfänger') && headerSet.has('Buchung')) {
    return 'ING-DiBa'
  }
  if (headerSet.has('Beguenstigter/Zahlungspflichtiger')) {
    return 'Sparkasse'
  }
  
  return 'Generic CSV'
}

function parseNumber(value: string): number {
  if (!value) return 0
  
  // Remove quotes and whitespace
  let cleaned = value.replace(/["'\s]/g, '')
  
  // Detect format by looking at the position of . and ,
  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  
  if (lastDot === -1 && lastComma === -1) {
    // No separators, just parse
    return parseFloat(cleaned.replace(/[^\d-]/g, '')) || 0
  }
  
  if (lastDot > lastComma) {
    // English format: 1,234.56 (dot is decimal)
    // Remove thousands separator (comma), keep decimal (dot)
    cleaned = cleaned.replace(/,/g, '')
  } else if (lastComma > lastDot) {
    // German format: 1.234,56 (comma is decimal)
    // Remove thousands separator (dot), convert decimal comma to dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (lastComma !== -1) {
    // Only comma present - could be either format
    // If comma has exactly 2 digits after, treat as decimal
    const afterComma = cleaned.slice(lastComma + 1)
    if (afterComma.length === 2 && /^\d+$/.test(afterComma)) {
      cleaned = cleaned.replace(',', '.')
    } else {
      // Treat as thousands separator
      cleaned = cleaned.replace(/,/g, '')
    }
  }
  
  // Remove any remaining non-numeric chars except . and -
  cleaned = cleaned.replace(/[^\d.-]/g, '')
  
  return parseFloat(cleaned) || 0
}

function parseDate(value: string): string {
  if (!value) return ''
  
  // Try German format: DD.MM.YYYY
  const germanMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (germanMatch) {
    const [, day, month, year] = germanMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  // Try ISO format: YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return value.slice(0, 10)
  }
  
  // Try US format: MM/DD/YYYY
  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  // Fallback: try to parse with Date
  const parsed = new Date(value)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  
  return value
}

function parseTransferFlag(value: string): boolean {
  if (!value) return false
  const lower = value.toLowerCase()
  return lower === 'ja' || lower === 'yes' || lower === 'true' || lower === '1'
}

// Main entry point - detects file type and parses accordingly
export async function parseFile(file: File): Promise<RawTransaction[]> {
  const fileType = getFileType(file)
  
  switch (fileType) {
    case 'csv':
      return parseCSV(file)
    case 'excel':
      return parseExcel(file)
    case 'ofx':
      return parseOFX(file)
    default:
      throw new Error(`Unsupported file type: ${file.name}. Supported formats: ${getSupportedExtensions()}`)
  }
}

// Parse CSV files
export async function parseCSV(file: File): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors)
        }

        const transactions = processRows(
          results.data as Record<string, string>[],
          results.meta.fields || []
        )
        resolve(transactions)
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`))
      }
    })
  })
}

// Parse Excel files (.xlsx, .xls)
export async function parseExcel(file: File): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        
        // Use the first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON with headers (header: 1 returns array of arrays)
        const rows = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          raw: false,
          dateNF: 'yyyy-mm-dd'
        }) as unknown[][]
        
        if (rows.length < 2) {
          resolve([])
          return
        }
        
        // First row is headers
        const headers = (rows[0] as string[]).map(h => String(h || '').trim())
        
        // Convert remaining rows to objects
        const dataRows: Record<string, string>[] = []
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[]
          const obj: Record<string, string> = {}
          headers.forEach((header, index) => {
            const value = row[index]
            obj[header] = value != null ? String(value) : ''
          })
          dataRows.push(obj)
        }
        
        const transactions = processRows(dataRows, headers)
        resolve(transactions)
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// Parse OFX/QFX files (Open Financial Exchange)
export async function parseOFX(file: File): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const transactions: RawTransaction[] = []
        
        // Simple OFX parser - extract transactions between <STMTTRN> tags
        const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
        const matches = content.matchAll(txRegex)
        
        for (const match of matches) {
          const txContent = match[1]
          
          // Extract fields
          const getField = (name: string): string => {
            const regex = new RegExp(`<${name}>([^<\\n]+)`, 'i')
            const fieldMatch = txContent.match(regex)
            return fieldMatch ? fieldMatch[1].trim() : ''
          }
          
          const dateStr = getField('DTPOSTED')
          const amount = parseFloat(getField('TRNAMT')) || 0
          const name = getField('NAME')
          const memo = getField('MEMO')
          const type = getField('TRNTYPE')
          
          // Parse OFX date format: YYYYMMDD or YYYYMMDDHHMMSS
          let date = ''
          if (dateStr.length >= 8) {
            date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
          }
          
          if (date && amount !== 0) {
            transactions.push({
              date,
              description: memo || name || type,
              amount,
              currency: getField('CURRENCY') || 'EUR',
              recipient: name,
              category: type,
              rawData: { 
                DTPOSTED: dateStr, 
                TRNAMT: String(amount), 
                NAME: name, 
                MEMO: memo,
                TRNTYPE: type 
              },
            })
          }
        }
        
        // Sort by date descending
        transactions.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        
        resolve(transactions)
      } catch (error) {
        reject(new Error(`Failed to parse OFX file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read OFX file'))
    }
    
    reader.readAsText(file)
  })
}

// Common row processing logic
function processRows(rows: Record<string, string>[], headers: string[]): RawTransaction[] {
  const transactions: RawTransaction[] = []
  
  // Create column mapping
  const columnMap = new Map<string, string>()
  for (const header of headers) {
    columnMap.set(header, normalizeColumnName(header))
  }

  for (const row of rows) {
    // Skip completely empty rows
    if (Object.values(row).every(v => !v || v.trim() === '')) {
      continue
    }

    const mapped: Record<string, unknown> = { rawData: row }
    
    for (const [original, normalized] of columnMap) {
      const value = row[original]
      
      switch (normalized) {
        case 'date':
          mapped.date = parseDate(value)
          break
        case 'amount':
          mapped.amount = parseNumber(value)
          break
        case 'isTransfer':
          mapped.isTransfer = parseTransferFlag(value)
          break
        case 'currency':
          mapped.currency = value || 'EUR'
          break
        default:
          mapped[normalized] = value
      }
    }

    // Validate required fields
    if (mapped.date && mapped.amount !== undefined) {
      transactions.push({
        date: mapped.date as string,
        description: (mapped.description as string) || '',
        amount: mapped.amount as number,
        currency: (mapped.currency as string) || 'EUR',
        category: mapped.category as string | undefined,
        subcategory: mapped.subcategory as string | undefined,
        recipient: mapped.recipient as string | undefined,
        recipientIban: mapped.recipientIban as string | undefined,
        referenceAccount: mapped.referenceAccount as string | undefined,
        referenceAccountName: mapped.referenceAccountName as string | undefined,
        isTransfer: mapped.isTransfer as boolean | undefined,
        rawData: mapped.rawData as Record<string, string>,
      })
    }
  }

  // Sort by date descending (most recent first)
  transactions.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return transactions
}

export function detectCurrency(transactions: RawTransaction[]): string {
  const currencies = new Map<string, number>()
  
  for (const tx of transactions) {
    const currency = tx.currency || 'EUR'
    currencies.set(currency, (currencies.get(currency) || 0) + 1)
  }
  
  // Return most common currency
  let maxCount = 0
  let mostCommon = 'EUR'
  
  for (const [currency, count] of currencies) {
    if (count > maxCount) {
      maxCount = count
      mostCommon = currency
    }
  }
  
  return mostCommon
}
