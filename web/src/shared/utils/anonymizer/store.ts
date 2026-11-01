import type { AnonymizationMapping } from '@/shared/types'
import { PATTERNS } from './constants'

class AnonymizationStore {
  private mappings: Map<string, AnonymizationMapping> = new Map()
  private counters = { name: 0, iban: 0, account: 0, email: 0, phone: 0, address: 0 }

  clear() {
    this.mappings.clear()
    this.counters = { name: 0, iban: 0, account: 0, email: 0, phone: 0, address: 0 }
  }

  getOrCreate(original: string, type: AnonymizationMapping['type']): string {
    const key = `${type}:${original}`

    if (this.mappings.has(key)) {
      return this.mappings.get(key)!.anonymized
    }

    let anonymized: string

    switch (type) {
      case 'name':
        this.counters.name++
        anonymized = `Person_${this.generateId(this.counters.name)}`
        break
      case 'iban':
        anonymized = original.slice(0, 2) + '*'.repeat(original.length - 6) + original.slice(-4)
        break
      case 'account':
        this.counters.account++
        anonymized = `Acc_${this.generateId(this.counters.account)}`
        break
      case 'email': {
        const [local, domain] = original.split('@')
        anonymized = `${local[0]}***@${domain}`
        break
      }
      case 'phone':
        anonymized = '+**********' + original.slice(-4)
        break
      case 'address':
        this.counters.address++
        anonymized = `Address_${this.counters.address}`
        break
      default:
        anonymized = '[REDACTED]'
    }

    const mapping: AnonymizationMapping = { original, anonymized, type }
    this.mappings.set(key, mapping)

    return anonymized
  }

  getAllMappings(): AnonymizationMapping[] {
    return Array.from(this.mappings.values())
  }

  private generateId(num: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let id = ''
    let n = num
    while (n > 0 || id.length < 3) {
      id = chars[n % chars.length] + id
      n = Math.floor(n / chars.length)
    }
    return id
  }
}

export const anonymizationStore = new AnonymizationStore()

export function anonymizeText(text: string, personalNames: Set<string>): string {
  if (!text) return text

  let result = text

  result = result.replace(PATTERNS.iban, match => anonymizationStore.getOrCreate(match, 'iban'))
  result = result.replace(PATTERNS.email, match => anonymizationStore.getOrCreate(match, 'email'))
  result = result.replace(PATTERNS.phone, match => anonymizationStore.getOrCreate(match, 'phone'))

  for (const name of personalNames) {
    if (name && name.length > 3) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const namePattern = new RegExp(`\\b${escapedName}\\b`, 'gi')
      result = result.replace(namePattern, anonymizationStore.getOrCreate(name, 'name'))
    }
  }

  return result
}
