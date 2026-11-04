import type { Transaction } from '@/shared/types'
import { withoutReferences } from './merchantReferences'
import { merchantFromDescription, shopBehindProcessor } from '../merchantFromDescription'

/** What a merchant was taught: its category, and the subcategory inside it when one was chosen. */
export interface Learned {
  category: string
  detail?: string
}

let learnedMappings: Map<string, Learned> = new Map()

export function setLearnedMappings(mappings: Array<{ merchant: string; category: string; detail?: string }>): void {
  learnedMappings = new Map(
    mappings.map(m => [normalizeMerchant(m.merchant), { category: m.category, detail: m.detail || undefined }]),
  )
  console.log(`Loaded ${learnedMappings.size} learned categorizations`)
}

// What this person's transactions show to be references (order ids, payment codes): set once per categorizing pass
let references: ReadonlySet<string> = new Set()

export function setReferenceTokens(next: ReadonlySet<string>): void {
  references = next
}

/** A payee's name without the references that change with every payment. */
export function cleanPayee(name: string): string {
  return withoutReferences(name, references)
}

export function merchantKeyOf(tx: Pick<Transaction, 'merchant' | 'recipient' | 'description'>): string {
  // The shop first: `merchant` can just be the processor's cleaned name, which would group every PayPal row together
  const payee = tx.merchant || tx.recipient

  return shopBehindProcessor(tx) || (payee ? cleanPayee(payee) : descriptionKey(tx.description))
}

// Card payments often carry the merchant only in the text, wrapped in a bank prefix and a changing
// number or date. Strip those so every payment to the same merchant gets the same key.
const BANK_PREFIXES =
  /^(kartenzahlung|kartenumsatz|girocard|debitkarte|lastschrift|basislastschrift|sepa|visa|ec)\b[\s:/-]*/i

function descriptionKey(description: string): string {
  const named = merchantFromDescription(description)

  if (named) {
    return named
  }
  const cleaned = cleanPayee(description)
    .replace(BANK_PREFIXES, '')
    .replace(/\b\d{1,2}[./]\d{1,2}([./]\d{2,4})?\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return (cleaned || description).slice(0, 30).trim()
}

export function sameMerchant(a: string, b: string): boolean {
  return normalizeMerchant(a) === normalizeMerchant(b)
}

export function setLocalLearnedMapping(merchant: string, learned: Learned | null): Learned | null {
  const key = normalizeMerchant(merchant)
  const previous = learnedMappings.get(key) ?? null

  if (learned) {
    learnedMappings.set(key, learned)
  } else {
    learnedMappings.delete(key)
  }

  return previous
}

export function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
}

function getMerchantVariations(text: string): string[] {
  const normalized = normalizeMerchant(text)
  const variations: string[] = [normalized]
  const suffixes = [' gmbh', ' ag', ' kg', ' ltd', ' inc', ' co', ' ug', ' mbh', ' gbr', ' ohg', ' se']

  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      variations.push(normalized.slice(0, -suffix.length).trim())
    }
  }
  const prefixes = ['paypal ', 'klarna ', 'amazon ', 'ec ', 'visa ']

  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      variations.push(normalized.slice(prefix.length).trim())
    }
  }

  return [...new Set(variations.filter(v => v.length > 2))]
}

function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `)
}

export function findLearned(tx: Transaction): Learned | null {
  if (learnedMappings.size === 0) {
    return null
  }

  if (tx.merchant) {
    const learned = learnedMappings.get(normalizeMerchant(tx.merchant))

    if (learned) {
      return learned
    }
  }

  // A PayPal recipient would apply one category to every shop; the shop name is matched through the description below
  if (tx.recipient && !shopBehindProcessor(tx)) {
    const learned = learnedMappings.get(normalizeMerchant(cleanPayee(tx.recipient)))

    if (learned) {
      return learned
    }
  }

  // The star is a separator here, or "DE*BT7" would fuse into one word and never contain the merchant "DE"
  const descNormalized = normalizeMerchant(tx.description.replace(/\*/g, ' '))

  for (const [merchant, found] of learnedMappings) {
    if (merchant.length > 3 && containsWords(descNormalized, merchant)) {
      return found
    }
  }

  // Same reason as above: skip the PayPal recipient here too, or an old "PayPal" rule still covers every shop
  const recipient = shopBehindProcessor(tx) ? undefined : tx.recipient
  const textsToCheck = [tx.merchant, recipient, tx.description].filter(Boolean) as string[]

  for (const text of textsToCheck) {
    for (const variation of getMerchantVariations(text)) {
      const learned = learnedMappings.get(variation)

      if (learned) {
        return learned
      }
      for (const [storedMerchant, found] of learnedMappings) {
        if (storedMerchant.length > 3 && containsWords(variation, storedMerchant)) {
          return found
        }
      }
    }
  }

  return null
}
