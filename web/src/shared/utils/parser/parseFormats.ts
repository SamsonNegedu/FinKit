import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { RawTransaction } from '@/shared/types'
import { getFileType, getSupportedExtensions } from './fileTypes'
import { processRows } from './rowProcessing'

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

async function parseCSV(file: File): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: results => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors)
        }

        const transactions = processRows(results.data as Record<string, string>[], results.meta.fields || [])

        resolve(transactions)
      },
      error: error => {
        reject(new Error(`Failed to parse CSV: ${error.message}`))
      },
    })
  })
}

async function parseExcel(file: File): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })

        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        const rows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          dateNF: 'yyyy-mm-dd',
        }) as unknown[][]

        if (rows.length < 2) {
          resolve([])

          return
        }

        const headers = (rows[0] as string[]).map(h => String(h || '').trim())

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

        resolve(processRows(dataRows, headers))
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

async function parseOFX(file: File): Promise<RawTransaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      try {
        const content = e.target?.result as string
        const transactions: RawTransaction[] = []

        const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
        const matches = content.matchAll(txRegex)

        for (const match of matches) {
          const txContent = match[1]

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
                TRNTYPE: type,
              },
            })
          }
        }

        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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
