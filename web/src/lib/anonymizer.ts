import { RawTransaction, Transaction, AnonymizationMapping, AnonymizedData } from '../types'

// Patterns for identifying personal data
const PATTERNS = {
  // IBAN patterns for different countries
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,16}/g,
  
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (international format)
  phone: /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
}

// Known merchants/businesses that should NOT be anonymized
const KNOWN_MERCHANTS = new Set([
  // Supermarkets
  'rewe', 'aldi', 'lidl', 'edeka', 'netto', 'penny', 'kaufland', 'real',
  // Drugstores
  'dm', 'rossmann', 'müller',
  // Online retail
  'amazon', 'zalando', 'otto', 'ebay', 'mediamarkt', 'saturn', 'flaconi',
  // Food delivery
  'lieferando', 'wolt', 'uber eats', 'delivery hero',
  // Fast food
  'mcdonalds', 'burger king', 'subway', 'kfc', 'starbucks',
  // Tech/Entertainment
  'apple', 'netflix', 'spotify', 'playstation', 'xbox', 'steam', 'nintendo',
  'sony interactive entertainment', 'google', 'paypal',
  // Banks/Finance
  'scalable capital', 'trade republic', 'n26', 'dkb', 'sparkasse', 'commerzbank',
  'deutsche bank', 'ing', 'comdirect', 'finanzamt', 'transferwise', 'wise',
  // Insurance
  'allianz', 'ergo', 'huk', 'axa', 'getsafe',
  // Telecom
  'telekom', 'vodafone', 'o2', 'congstar', 'aldi talk', 'rebtel',
  // Transport
  'deutsche bahn', 'db', 'bvg', 'uber', 'bolt', 'freenow',
  // Utilities
  'vattenfall', 'eon', 'beitragsservice', 'ard', 'zdf',
  // Other common merchants
  'ikea', 'h&m', 'zara', 'primark', 'zeeman', 'maya handels',
])

// Business suffixes that indicate a company, not a person
const BUSINESS_SUFFIXES = [
  'gmbh', 'ag', 'ltd', 'inc', 'co', 'kg', 'ohg', 'ug', 'se', 'ev', 'e.v.',
  'corp', 'llc', 'limited', 'holding', 'group', 'services', 'payments',
  'bank', 'sparkasse', 'versicherung', 'finanz', 'capital',
]

// Check if a name looks like a business/merchant
function isLikelyBusiness(name: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase().trim()
  
  // Check against known merchants
  for (const merchant of KNOWN_MERCHANTS) {
    if (lower.includes(merchant)) return true
  }
  
  // Check for business suffixes
  for (const suffix of BUSINESS_SUFFIXES) {
    if (lower.includes(suffix)) return true
  }
  
  // If we don't recognize it, assume it could be personal (privacy-first)
  return false
}

// In-memory mapping store (never persisted)
class AnonymizationStore {
  private mappings: Map<string, AnonymizationMapping> = new Map()
  private reverseMap: Map<string, string> = new Map()
  private counters = { name: 0, iban: 0, account: 0, email: 0, phone: 0, address: 0 }

  clear() {
    this.mappings.clear()
    this.reverseMap.clear()
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
        // Keep country code and last 4 digits
        anonymized = original.slice(0, 2) + '*'.repeat(original.length - 6) + original.slice(-4)
        break
      case 'account':
        this.counters.account++
        anonymized = `Acc_${this.generateId(this.counters.account)}`
        break
      case 'email':
        const [local, domain] = original.split('@')
        anonymized = `${local[0]}***@${domain}`
        break
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
    this.reverseMap.set(anonymized, original)
    
    return anonymized
  }

  getOriginal(anonymized: string): string | undefined {
    return this.reverseMap.get(anonymized)
  }

  getAllMappings(): AnonymizationMapping[] {
    return Array.from(this.mappings.values())
  }

  private generateId(num: number): string {
    // Generate a short alphanumeric ID
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

// Singleton store instance
const store = new AnonymizationStore()

function anonymizeText(text: string, personalNames: Set<string>): string {
  if (!text) return text

  let result = text

  // Anonymize IBANs (keep country + last 4)
  result = result.replace(PATTERNS.iban, (match) => {
    return store.getOrCreate(match, 'iban')
  })

  // Anonymize emails
  result = result.replace(PATTERNS.email, (match) => {
    return store.getOrCreate(match, 'email')
  })

  // Anonymize phone numbers
  result = result.replace(PATTERNS.phone, (match) => {
    return store.getOrCreate(match, 'phone')
  })

  // Only anonymize known personal names (not businesses)
  for (const name of personalNames) {
    if (name && name.length > 3) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const namePattern = new RegExp(`\\b${escapedName}\\b`, 'gi')
      result = result.replace(namePattern, store.getOrCreate(name, 'name'))
    }
  }

  return result
}

export function anonymizeTransactions(rawTransactions: RawTransaction[]): AnonymizedData {
  // Clear previous mappings
  store.clear()

  // First pass: collect personal names (non-business recipients) for text anonymization
  const personalNames = new Set<string>()
  for (const tx of rawTransactions) {
    if (tx.recipient && tx.recipient.length > 3 && !isLikelyBusiness(tx.recipient)) {
      personalNames.add(tx.recipient)
    }
  }

  // Second pass: anonymize transactions
  const transactions: Transaction[] = rawTransactions.map((raw, index) => {
    // Only anonymize recipient if it looks like a personal name, not a business
    const anonymizedRecipient = raw.recipient 
      ? (isLikelyBusiness(raw.recipient) ? raw.recipient : store.getOrCreate(raw.recipient, 'name'))
      : undefined

    // Always anonymize IBANs (but only partially - keep country and last 4)
    const anonymizedIban = raw.recipientIban
      ? store.getOrCreate(raw.recipientIban, 'iban')
      : undefined

    // Keep reference account names as-is (they're your own accounts)
    const referenceAccount = raw.referenceAccount

    // Anonymize personal names in description, but keep merchant names
    const anonymizedDescription = anonymizeText(raw.description, personalNames)

    // Extract merchant name from recipient if it's a business
    const merchant = raw.recipient && isLikelyBusiness(raw.recipient) 
      ? cleanMerchantName(raw.recipient)
      : undefined

    return {
      ...raw,
      id: `tx_${Date.now()}_${index}`,
      recipient: anonymizedRecipient,
      recipientIban: anonymizedIban,
      referenceAccount,
      description: anonymizedDescription,
      merchant,
      type: raw.amount < 0 ? 'expense' : 'income',
      amount: Math.abs(raw.amount),
      categorySource: raw.category ? 'rule' : undefined,
    } as Transaction
  })

  return {
    transactions,
    mappings: store.getAllMappings(),
  }
}

// Clean up merchant name for display
function cleanMerchantName(name: string): string {
  return name
    .replace(/\b(gmbh|ag|ltd|ug|kg|inc|co)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Process transactions WITHOUT any anonymization (for when user disables it)
export function processWithoutAnonymization(rawTransactions: RawTransaction[]): Transaction[] {
  return rawTransactions.map((raw, index) => {
    // Extract merchant name from recipient if it's a business
    const merchant = raw.recipient && isLikelyBusiness(raw.recipient) 
      ? cleanMerchantName(raw.recipient)
      : undefined

    return {
      ...raw,
      id: `tx_${Date.now()}_${index}`,
      merchant,
      type: raw.amount < 0 ? 'expense' : 'income',
      amount: Math.abs(raw.amount),
      categorySource: raw.category ? 'rule' : undefined,
    } as Transaction
  })
}

export function getOriginalValue(anonymized: string): string | undefined {
  return store.getOriginal(anonymized)
}

export function clearAnonymizationData(): void {
  store.clear()
}

// For display: show original value in tooltip
export function getDisplayValue(anonymized: string): { display: string; original?: string } {
  const original = store.getOriginal(anonymized)
  return {
    display: anonymized,
    original,
  }
}
