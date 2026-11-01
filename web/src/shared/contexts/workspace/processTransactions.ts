import { applyAliases } from '@/shared/utils/aliases'
import { anonymizeTransactions, processWithoutAnonymization } from '@/shared/utils/anonymizer'
import { categorizeWithRules } from '@/shared/utils/categorizer'
import { detectDoubleBookings } from '@/shared/utils/double-booking'
import { assignStableIds } from '@/shared/utils/ids'
import { detectRecurring } from '@/shared/utils/recurring'
import type { RawTransaction, Transaction } from '@/shared/types'

export function processTransactions(raw: RawTransaction[], anonymize: boolean): Transaction[] {
  const base = anonymize ? anonymizeTransactions(raw).transactions : processWithoutAnonymization(raw)
  const processed = assignStableIds(base, raw)
  const categorized = categorizeWithRules(processed)
  const withDoubleBookings = detectDoubleBookings(categorized)

  return applyAliases(detectRecurring(withDoubleBookings))
}
