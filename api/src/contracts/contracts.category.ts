import type { Frequency, Kind } from './contracts.types'

/** Payments that cannot be sorted by name or rhythm go here. */
export const FALLBACK = 'Other'

/**
 * What a payee's name or payment text says it is, as the first choice and then the next best among
 * the person's own categories. Only a category the person actually has can be suggested.
 */
const BY_NAME: Array<[RegExp, string[]]> = [
  [/\b(miete|rent|vermieter|hausverwaltung|wohnung|nebenkosten|hausgeld|wohnungsbau)\b/i, ['Rent']],
  [/\b(strom|energie|energy|stadtwerke|vattenfall|e\.?on|eon|enbw|gas|wasser)\b/i, ['Electricity']],
  [/\b(telekom|vodafone|o2|congstar|1&1|internet|mobilfunk|dsl)\b/i, ['Internet']],
  [/\b(beitragsservice|rundfunk|gez)\b/i, ['Radio Tax']],
  [/\b(versicherung|insurance|allianz|huk|axa|ergo|barmenia|krankenkasse|haftpflicht)\b/i, ['Insurance']],
  [/\b(leasing|kfz|tankstelle|adac|parkhaus|sixt)\b/i, ['Car']],
  [/\b(bvg|bahn|deutschlandticket|db vertrieb|mvv|hvv|vbb)\b/i, ['Public Transport']],
  [/\b(trade republic|scalable|sparplan|etf|depot|bitpanda|comdirect|flatex)\b/i, ['Investment', 'Savings']],
  [/\b(bausparen|bausparvertrag)\b/i, ['Savings']],
  [/\b(fitx|fitness|gym|mcfit|clever fit|john reed|urban sports|apotheke)\b/i, ['Health & Wellbeing', 'Subscriptions']],
  [
    /\b(netflix|spotify|disney|prime|apple|icloud|google|youtube|openai|anthropic|dazn|sky|audible|patreon|github|dropbox|microsoft|adobe|abo|subscription)\b/i,
    ['Subscriptions'],
  ],
]

/** A small fixed monthly amount is most likely a subscription. */
const SUBSCRIPTION_MAX = 30

export type Suggestion = { category: string } | null

/** A first guess at the contract's category: its name first, then how it behaves. Never the person's own word. */
export function suggestCategory(p: {
  text: string
  kind: Kind
  frequency: Frequency
  amount: number
  available: ReadonlySet<string>
}): Suggestion {
  const pick = (names: string[]) => names.find(n => p.available.has(n))

  for (const [pattern, names] of BY_NAME) {
    const found = pattern.test(p.text) ? pick(names) : undefined

    if (found) {
      return { category: found }
    }
  }
  // Nothing in the name: the rhythm is the only clue left
  const byRhythm =
    p.kind === 'fixed' && p.frequency !== 'monthly'
      ? pick(['Insurance'])
      : p.kind === 'fixed' && p.amount < SUBSCRIPTION_MAX
        ? pick(['Subscriptions'])
        : undefined

  return byRhythm ? { category: byRhythm } : null
}
