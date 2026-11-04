// Mirrors api/src/contracts/merchant-references.ts. The two copies must stay identical: a test compares them.

// A token is a run of characters between spaces, stars and slashes ("DE*BT7WM55K4" holds DE and BT7WM55K4)
const WITH_DIGIT = /[^\s*/]*\d[^\s*/]*/g

/**
 * The references among a person's transactions: tokens that carry a digit and show up in only one transaction.
 * An order id or a payment code is never seen twice, while a name that merely holds a digit ("Shop2Go") comes back
 * with every visit. Learning this from the data means a new bank format needs no new rule.
 */
export function referenceTokens(texts: Iterable<string>): Set<string> {
  const seen = new Map<string, number>()

  for (const text of texts) {
    for (const token of new Set(text.match(WITH_DIGIT) ?? [])) {
      seen.set(token, (seen.get(token) ?? 0) + 1)
    }
  }

  return new Set([...seen].filter(([, count]) => count === 1).map(([token]) => token))
}

/** The text without its references. A name that would be left with almost nothing is kept whole. */
export function withoutReferences(text: string, references: ReadonlySet<string>): string {
  if (references.size === 0) {
    return text
  }
  const stripped = text
    .replace(WITH_DIGIT, token => (references.has(token) ? ' ' : token))
    .replace(/^[\s*/]+|[\s*/]+$/g, '')
    .replace(/\s+/g, ' ')

  return stripped.length >= 3 ? stripped : text
}
