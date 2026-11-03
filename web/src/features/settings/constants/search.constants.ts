export interface RulesSearch {
  kind?: 'custom'
}

/** Merchant rules are the default view, so only the custom ones are named in the address */
export const validateRulesSearch = (s: Record<string, unknown>): RulesSearch => ({
  kind: s.kind === 'custom' ? 'custom' : undefined,
})
