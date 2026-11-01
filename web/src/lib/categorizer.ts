import { Transaction } from '../types'

// Rule-based categorization using merchant patterns
// These map regex patterns to categories
const MERCHANT_RULES: Array<{ pattern: RegExp; category: string; merchant?: string }> = [
  // Groceries
  { pattern: /\b(rewe|aldi|lidl|edeka|netto|penny|kaufland|real)\b/i, category: 'Groceries' },
  { pattern: /\b(dm[- ]drogerie|rossmann|müller)\b/i, category: 'Groceries' },
  { pattern: /\blebensmittel\b/i, category: 'Groceries' },
  
  // Eating Out / Delivery
  { pattern: /\b(lieferando|uber\s*eats|wolt|delivery\s*hero)\b/i, category: 'Eating Out', merchant: 'Delivery Service' },
  { pattern: /\b(mcdonalds|burger\s*king|subway|kfc|starbucks)\b/i, category: 'Eating Out' },
  { pattern: /\b(restaurant|cafe|coffee|bistro|pizza|kebab|sushi)\b/i, category: 'Eating Out' },
  { pattern: /\blieferservice\b/i, category: 'Eating Out' },
  
  // Entertainment
  { pattern: /\b(netflix|spotify|disney\+|amazon\s*prime|apple\s*music)\b/i, category: 'Subscriptions' },
  { pattern: /\b(playstation|xbox|steam|nintendo|epic\s*games)\b/i, category: 'Personal Entertainment' },
  { pattern: /\b(apple|itunes|google\s*play)\b/i, category: 'Personal Entertainment' },
  { pattern: /\b(sony\s*interactive)\b/i, category: 'Personal Entertainment' },
  { pattern: /\bin-app\b/i, category: 'Personal Entertainment' },
  
  // Shopping
  { pattern: /\b(amazon|zalando|otto|ebay|mediamarkt|saturn)\b/i, category: 'Shopping', merchant: 'Online Shopping' },
  { pattern: /\b(h&m|zara|primark|c&a|tk\s*maxx|zeeman)\b/i, category: 'Shopping' },
  { pattern: /\b(ikea|möbel)\b/i, category: 'Shopping' },
  { pattern: /\b(flaconi|douglas)\b/i, category: 'Shopping' },
  
  // Rent
  { pattern: /\b(miete|rent|wohnung|apartment)\b/i, category: 'Rent' },
  
  // Transport
  { pattern: /\b(deutsche\s*bahn|db\s|bvg|mvv|hvv|rmv|vbb)\b/i, category: 'Public Transport' },
  { pattern: /\b(uber|bolt|freenow|taxi)\b/i, category: 'Public Transport' },
  { pattern: /\b(shell|aral|esso|total|tankstelle)\b/i, category: 'Car' },
  { pattern: /\b(parkhaus|parking)\b/i, category: 'Car' },
  { pattern: /\bführerschein\b/i, category: 'Car' },
  
  // Living / Utilities
  { pattern: /\b(rundfunk|ard|zdf|beitragsservice)\b/i, category: 'Radio Tax' },
  { pattern: /\b(telekom|vodafone|o2|congstar|aldi\s*talk)\b/i, category: 'Internet' },
  { pattern: /\b(strom|vattenfall|eon|enercity|stadtwerke)\b/i, category: 'Electricity' },
  
  // Insurance
  { pattern: /\b(allianz|ergo|huk|axa|versicherung|getsafe)\b/i, category: 'Insurance' },
  
  // Health
  { pattern: /\b(apotheke|pharmacy|arzt|doctor|klinik|krankenhaus)\b/i, category: 'Health & Wellbeing' },
  { pattern: /\b(fitnessstudio|gym|mcfit|fitness\s*first)\b/i, category: 'Health & Wellbeing' },
  
  // Investment / Finance
  { pattern: /\b(scalable\s*capital|trade\s*republic|comdirect|ing\s*diba)\b/i, category: 'Investment' },
  { pattern: /\b(sparplan|etf|depot|kapitalanlage)\b/i, category: 'Investment' },
  
  // Income
  { pattern: /\b(lohn|gehalt|salary|wage)\b/i, category: 'Income' },
  { pattern: /\b(erstattung|refund|rückerstattung)\b/i, category: 'Income' },
  { pattern: /\b(finanzamt)\b/i, category: 'Income' }, // Tax refund
  
  // Travel
  { pattern: /\b(lufthansa|ryanair|easyjet|booking\.com|airbnb|hotel)\b/i, category: 'Travel' },
  { pattern: /\b(flug|flight|reise|urlaub)\b/i, category: 'Travel' },
]

// Categories that indicate internal transfers (between own accounts)
const TRANSFER_PATTERNS = [
  /\bsent\s+from\b/i,
  /\bmoved\s+(to|from)\b/i,
  /\büberweisungen?\b/i,
  /\bumbuchung\b/i,
]

// Learned mappings cache (populated by App.tsx on startup)
let learnedMappings: Map<string, string> = new Map()

// Set learned mappings (called from App.tsx after fetching from API)
export function setLearnedMappings(mappings: Array<{ merchant: string; category: string }>): void {
  // Normalize merchants to match how we'll query them
  learnedMappings = new Map(
    mappings.map(m => [normalizeMerchant(m.merchant), m.category])
  )
  console.log(`Loaded ${learnedMappings.size} learned categorizations`)
}

// Key used to group transactions by merchant (same logic everywhere in the UI)
export function merchantKeyOf(tx: Pick<Transaction, 'merchant' | 'recipient' | 'description'>): string {
  return tx.merchant || tx.recipient || tx.description.slice(0, 30)
}

export function sameMerchant(a: string, b: string): boolean {
  return normalizeMerchant(a) === normalizeMerchant(b)
}

// Add/replace/remove a learned mapping locally so re-processing keeps it
export function setLocalLearnedMapping(merchant: string, category: string | null): string | null {
  const key = normalizeMerchant(merchant)
  const previous = learnedMappings.get(key) ?? null
  if (category) learnedMappings.set(key, category)
  else learnedMappings.delete(key)
  return previous
}

// Normalize merchant name for matching (must match backend normalization)
export function normalizeMerchant(merchant: string): string {
  return merchant.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}

// Extract variations of merchant name for fuzzy matching
function getMerchantVariations(text: string): string[] {
  const normalized = normalizeMerchant(text)
  const variations: string[] = [normalized]
  
  // Common suffixes to strip
  const suffixes = [' gmbh', ' ag', ' kg', ' ltd', ' inc', ' co', ' ug', ' mbh', ' gbr', ' ohg', ' se']
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      variations.push(normalized.slice(0, -suffix.length).trim())
    }
  }
  
  // Strip common prefixes
  const prefixes = ['paypal ', 'klarna ', 'amazon ', 'ec ', 'visa ']
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      variations.push(normalized.slice(prefix.length).trim())
    }
  }
  
  return [...new Set(variations.filter(v => v.length > 2))]
}

// Whole-word containment: "rewe" matches "rewe markt" but "net" doesn't match "netflix"
function containsWords(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `)
}

// Check if a merchant/description matches any learned mapping with fuzzy matching
function findLearnedCategory(tx: Transaction): string | null {
  if (learnedMappings.size === 0) return null
  
  // 1. Exact match on normalized merchant
  if (tx.merchant) {
    const normalized = normalizeMerchant(tx.merchant)
    const learned = learnedMappings.get(normalized)
    if (learned) return learned
  }
  
  // 2. Exact match on normalized recipient
  if (tx.recipient) {
    const normalized = normalizeMerchant(tx.recipient)
    const learned = learnedMappings.get(normalized)
    if (learned) return learned
  }
  
  // 3. Fuzzy match - check if any learned merchant is contained in description
  const descNormalized = normalizeMerchant(tx.description)
  for (const [merchant, category] of learnedMappings) {
    if (merchant.length > 3 && containsWords(descNormalized, merchant)) {
      return category
    }
  }
  
  // 4. Variation matching - check merchant variations against learned mappings
  const textsToCheck = [tx.merchant, tx.recipient, tx.description].filter(Boolean) as string[]
  for (const text of textsToCheck) {
    const variations = getMerchantVariations(text)
    for (const variation of variations) {
      const learned = learnedMappings.get(variation)
      if (learned) return learned
      
      // Also check if any stored merchant is a substring of our variation
      for (const [storedMerchant, category] of learnedMappings) {
        if (storedMerchant.length > 3 && containsWords(variation, storedMerchant)) {
          return category
        }
      }
    }
  }
  
  return null
}

export function categorizeWithRules(transactions: Transaction[]): Transaction[] {
  return transactions.map(tx => {
    // Check if it's a transfer between own accounts
    if (tx.isTransfer) {
      return { ...tx, category: 'Transfer', categorySource: 'rule' as const }
    }

    // Check for transfer patterns in description
    for (const pattern of TRANSFER_PATTERNS) {
      if (pattern.test(tx.description)) {
        return { ...tx, category: 'Transfer', isTransfer: true, categorySource: 'rule' as const }
      }
    }

    // 1. First, check learned mappings (user's manual recategorizations take priority)
    const learnedCategory = findLearnedCategory(tx)
    if (learnedCategory) {
      return {
        ...tx,
        category: learnedCategory,
        categorySource: 'learned' as const,
      }
    }

    // 2. Try to map German categories from the source file
    const mappedCategory = mapGermanCategory(tx.category, tx.subcategory)
    
    if (mappedCategory && mappedCategory !== 'Other') {
      return {
        ...tx,
        category: mappedCategory,
        categorySource: 'rule' as const,
      }
    }

    // 3. Apply merchant rules for pattern-based categorization
    const textToMatch = `${tx.description} ${tx.recipient || ''} ${tx.category || ''} ${tx.subcategory || ''}`
    
    for (const rule of MERCHANT_RULES) {
      if (rule.pattern.test(textToMatch)) {
        return {
          ...tx,
          category: rule.category,
          merchant: rule.merchant || extractMerchant(textToMatch, rule.pattern),
          categorySource: 'rule' as const,
        }
      }
    }

    // 4. Fall back to mapped category or 'Other'
    return {
      ...tx,
      category: mappedCategory || 'Other',
      categorySource: tx.category ? 'rule' as const : undefined,
    }
  })
}

function extractMerchant(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern)
  if (match) {
    // Capitalize first letter
    return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase()
  }
  return undefined
}

function mapGermanCategory(category?: string, subcategory?: string): string | undefined {
  if (!category) return undefined
  
  const combined = subcategory ? `${category}/${subcategory}` : category
  
  const GERMAN_CATEGORY_MAP: Record<string, string> = {
    // Food
    'Essen & Trinken/Lebensmittel': 'Groceries',
    'Essen & Trinken/Lieferservice': 'Eating Out',
    'Essen & Trinken': 'Groceries',
    
    // Housing
    'Wohnen/Rundfunkgebuehren': 'Radio Tax',
    'Wohnen/Internet & Telefon': 'Internet',
    'Wohnen/Miete': 'Rent',
    'Wohnen/Strom': 'Electricity',
    'Wohnen': 'Rent',
    
    // Lifestyle & Shopping
    'Lifestyle/Shopping': 'Shopping',
    'Lifestyle/Bekleidung': 'Shopping',
    'Lifestyle/Mobilfunk': 'Internet',
    'Lifestyle/Prime-Mitgliedschaft': 'Subscriptions',
    'Lifestyle/Sonstiger Lifestyle': 'Shopping',
    'Lifestyle': 'Shopping',
    
    // Entertainment
    'Freizeit/In-App-Kaeufe': 'Personal Entertainment',
    'Freizeit': 'Personal Entertainment',
    
    // Health
    'Gesundheit/Apotheke': 'Health & Wellbeing',
    'Gesundheit': 'Health & Wellbeing',
    
    // Transport
    'Mobilitaet/Fuehrerschein': 'Car',
    'Mobilitaet/Auto': 'Car',
    'Mobilitaet': 'Public Transport',
    
    // Insurance
    'Versicherungen/Sonstige Sachversicherung': 'Insurance',
    'Versicherungen': 'Insurance',
    
    // Finance / Savings / Investment
    'Sparen/Kapitalanlage': 'Investment',  // Capital investment (ETFs, stocks, etc.)
    'Sparen/Sparplan': 'Investment',       // Savings plan
    'Sparen': 'Savings',                   // General savings
    'Finanzen/Investment': 'Investment',
    'Finanzen/Steuern': 'Other',
    'Finanzen': 'Other',
    
    // Income
    'Einnahmen/Lohn / Gehalt': 'Income',
    'Einnahmen/Sonstige Einnahmen': 'Income',
    'Einnahmen': 'Income',
    
    // Other
    'Sonstiges/Sonstige Ausgaben': 'Other',
    'Sonstiges': 'Other',
    'Drogerie/Drogerie': 'Groceries',
    'Drogerie': 'Groceries',
  }
  
  // Try combined first, then just category
  return GERMAN_CATEGORY_MAP[combined] || GERMAN_CATEGORY_MAP[category]
}

// Categories matching your Google Sheet columns (in order)
// Expense categories for the sheet
export const EXPENSE_CATEGORIES = [
  'Rent',
  'Eating Out',
  'Personal Entertainment',
  'Subscriptions',
  'Car',
  'Public Transport',
  'Internet',
  'Electricity',
  'Insurance',
  'Travel',
  'Groceries',
  'Family',
  'Radio Tax',
  'Health & Wellbeing',
  'Shopping',
  'Other',
  'Gifts',
] as const

// Non-expense categories that always exist, whatever the sheet looks like
const SYSTEM_CATEGORIES = ['Income', 'Savings', 'Investment', 'Transfer']

// Expense categories currently in use. Defaults to the built-in list; replaced with the
// sheet's own columns once a sheet layout is known (see setExpenseCategories).
let activeExpenseCategories: string[] = [...EXPENSE_CATEGORIES]

export function setExpenseCategories(names: string[]): void {
  activeExpenseCategories = names.length > 0 ? [...names] : [...EXPENSE_CATEGORIES]
}

export function getExpenseCategories(): string[] {
  return activeExpenseCategories
}

// All available categories for dropdowns (expense columns from the sheet + system ones)
export function getAvailableCategories(): string[] {
  return [...activeExpenseCategories, ...SYSTEM_CATEGORIES.filter(c => !activeExpenseCategories.includes(c))]
}

// Category colors for charts
const CATEGORY_COLORS: Record<string, string> = {
  'Rent': '#8b5cf6',
  'Eating Out': '#f59e0b',
  'Personal Entertainment': '#ec4899',
  'Subscriptions': '#a855f7',
  'Car': '#6366f1',
  'Public Transport': '#14b8a6',
  'Internet': '#3b82f6',
  'Electricity': '#f97316',
  'Insurance': '#06b6d4',
  'Travel': '#84cc16',
  'Groceries': '#10b981',
  'Family': '#f43f5e',
  'Radio Tax': '#7c3aed',
  'Health & Wellbeing': '#22c55e',
  'Shopping': '#fb7185',
  'Other': '#64748b',
  'Gifts': '#e11d48',
  'Income': '#10b981',
  'Savings': '#0ea5e9',
  'Investment': '#0284c7',
  'Transfer': '#94a3b8',
}

// Known categories keep their color; new sheet columns get a stable generated one
export function getCategoryColor(category: string | undefined): string {
  const name = category || 'Other'
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  // Hex (not hsl) because callers append an alpha suffix like `${color}20`
  const h = hash % 360, sat = 0.65, l = 0.55
  const a = sat * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
