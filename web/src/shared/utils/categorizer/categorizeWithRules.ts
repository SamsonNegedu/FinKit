import type { Transaction } from '@/shared/types'
import { MERCHANT_RULES, TRANSFER_PATTERNS } from './merchantRules'
import { mapGermanCategory } from './germanCategoryMap'
import { isCashWithdrawal } from '@/shared/utils/cashWithdrawal'
import { findLearnedCategory } from './learnedMappings'
import { findRuleCategory } from './transactionRules'

function extractMerchant(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern)

  if (match) {
    return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase()
  }

  return undefined
}

export function categorizeWithRules(transactions: Transaction[]): Transaction[] {
  return transactions.map(tx => {
    if (tx.isTransfer) {
      return { ...tx, category: 'Transfer', categorySource: 'rule' as const }
    }

    for (const pattern of TRANSFER_PATTERNS) {
      if (pattern.test(tx.description)) {
        return { ...tx, category: 'Transfer', isTransfer: true, categorySource: 'rule' as const }
      }
    }

    // A rule the person made from a transaction is more specific than a merchant rule, so it goes first
    const ruleCategory = findRuleCategory(tx)

    if (ruleCategory) {
      return { ...tx, category: ruleCategory, categorySource: 'learned' as const }
    }

    const learnedCategory = findLearnedCategory(tx)

    if (learnedCategory) {
      return { ...tx, category: learnedCategory, categorySource: 'learned' as const }
    }

    // Cash taken out: until you say what it was for, it is just Cash (a rule you set for withdrawals still wins above)
    if (isCashWithdrawal(tx)) {
      return { ...tx, category: 'Cash', categorySource: 'rule' as const }
    }

    const mappedCategory = mapGermanCategory(tx.category, tx.subcategory)

    if (mappedCategory && mappedCategory !== 'Other') {
      return { ...tx, category: mappedCategory, categorySource: 'rule' as const }
    }

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

    return {
      ...tx,
      category: mappedCategory || 'Other',
      categorySource: tx.category ? ('rule' as const) : undefined,
    }
  })
}
