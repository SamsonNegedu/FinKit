export const PATTERNS = {
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,16}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
}

export const KNOWN_MERCHANTS = new Set([
  'rewe',
  'aldi',
  'lidl',
  'edeka',
  'netto',
  'penny',
  'kaufland',
  'real',
  'dm',
  'rossmann',
  'müller',
  'amazon',
  'zalando',
  'otto',
  'ebay',
  'mediamarkt',
  'saturn',
  'flaconi',
  'lieferando',
  'wolt',
  'uber eats',
  'delivery hero',
  'mcdonalds',
  'burger king',
  'subway',
  'kfc',
  'starbucks',
  'apple',
  'netflix',
  'spotify',
  'playstation',
  'xbox',
  'steam',
  'nintendo',
  'sony interactive entertainment',
  'google',
  'paypal',
  'scalable capital',
  'trade republic',
  'n26',
  'dkb',
  'sparkasse',
  'commerzbank',
  'deutsche bank',
  'ing',
  'comdirect',
  'finanzamt',
  'transferwise',
  'wise',
  'allianz',
  'ergo',
  'huk',
  'axa',
  'getsafe',
  'telekom',
  'vodafone',
  'o2',
  'congstar',
  'aldi talk',
  'rebtel',
  'deutsche bahn',
  'db',
  'bvg',
  'uber',
  'bolt',
  'freenow',
  'vattenfall',
  'eon',
  'beitragsservice',
  'ard',
  'zdf',
  'ikea',
  'h&m',
  'zara',
  'primark',
  'zeeman',
  'maya handels',
])

const BUSINESS_SUFFIXES = [
  'gmbh',
  'ag',
  'ltd',
  'inc',
  'co',
  'kg',
  'ohg',
  'ug',
  'se',
  'ev',
  'e.v.',
  'corp',
  'llc',
  'limited',
  'holding',
  'group',
  'services',
  'payments',
  'bank',
  'sparkasse',
  'versicherung',
  'finanz',
  'capital',
]

export function isLikelyBusiness(name: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase().trim()
  for (const merchant of KNOWN_MERCHANTS) {
    if (lower.includes(merchant)) return true
  }
  for (const suffix of BUSINESS_SUFFIXES) {
    if (lower.includes(suffix)) return true
  }
  return false
}

export function cleanMerchantName(name: string): string {
  return name
    .replace(/\b(gmbh|ag|ltd|ug|kg|inc|co)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}
