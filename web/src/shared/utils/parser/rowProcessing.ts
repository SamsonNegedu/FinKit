import type { RawTransaction } from '@/shared/types'
import { normalizeColumnName } from './columnMaps'

function parseNumber(value: string): number {
  if (!value) return 0

  let cleaned = value.replace(/["'\s]/g, '')

  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')

  if (lastDot === -1 && lastComma === -1) {
    return parseFloat(cleaned.replace(/[^\d-]/g, '')) || 0
  }

  if (lastDot > lastComma) {
    cleaned = cleaned.replace(/,/g, '')
  } else if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (lastComma !== -1) {
    const afterComma = cleaned.slice(lastComma + 1)
    if (afterComma.length === 2 && /^\d+$/.test(afterComma)) {
      cleaned = cleaned.replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  }

  cleaned = cleaned.replace(/[^\d.-]/g, '')

  return parseFloat(cleaned) || 0
}

function parseDate(value: string): string {
  if (!value) return ''

  const germanMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (germanMatch) {
    const [, day, month, year] = germanMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return value.slice(0, 10)
  }

  const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

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

export function processRows(rows: Record<string, string>[], headers: string[]): RawTransaction[] {
  const transactions: RawTransaction[] = []

  const columnMap = new Map<string, string>()
  for (const header of headers) {
    columnMap.set(header, normalizeColumnName(header))
  }

  for (const row of rows) {
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

  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return transactions
}
