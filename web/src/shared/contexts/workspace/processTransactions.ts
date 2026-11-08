import { applyAliases } from '@/shared/utils/aliases'
import { anonymizeTransactions, processWithoutAnonymization } from '@/shared/utils/anonymizer'
import { categorizeWithRules, findRule } from '@/shared/utils/categorizer'
import { detectDoubleBookings } from '@/shared/utils/double-booking'
import { assignStableIds } from '@/shared/utils/ids'
import { detectRecurring } from '@/shared/utils/recurring'
import type { RawTransaction, Transaction } from '@/shared/types'

export function processTransactions(raw: RawTransaction[], anonymize: boolean): Transaction[] {
  const base = anonymize ? anonymizeTransactions(raw).transactions : processWithoutAnonymization(raw)
  const processed = assignStableIds(base, raw)
  const categorized = categorizeWithRules(processed)
  // Double-booking detection files every transfer between your accounts as Transfer, which would undo a rule of
  // yours (the one that says a credit to your savings account is Savings). The rule's category is put back.
  const ruled = new Map(categorized.filter(t => findRule(t)).map(t => [t.id, t]))
  const withDoubleBookings = detectDoubleBookings(categorized).map(t => {
    const rule = ruled.get(t.id)

    return rule
      ? { ...t, category: rule.category, categoryDetail: rule.categoryDetail, categorySource: rule.categorySource }
      : t
  })

  return applyAliases(detectRecurring(withDoubleBookings))
}
