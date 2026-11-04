import type { Transaction } from '@/shared/types'
import { MERCHANT_RULES, TRANSFER_PATTERNS } from './merchantRules'
import { mapGermanCategory } from './germanCategoryMap'
import { isCashWithdrawal } from '@/shared/utils/cashWithdrawal'
import { findLearned, setReferenceTokens } from './learnedMappings'
import { referenceTokens } from './merchantReferences'
import { findRule } from './transactionRules'

function extractMerchant(text: string, pattern: RegExp): string | undefined {
  const match = text.match(pattern)

  if (match) {
    return match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase()
  }

  return undefined
}

export function categorizeWithRules(transactions: Transaction[]): Transaction[] {
  // What repeats is a name and what never does is a reference, so this has to see the whole set before any row is keyed
  setReferenceTokens(
    referenceTokens(transactions.map(t => `${t.merchant ?? ''} ${t.recipient ?? ''} ${t.description}`)),
  )

  return transactions.map(tx => {
    if (tx.isTransfer) {
      return { ...tx, category: 'Transfer', categorySource: 'rule' as const }
    }

    for (const pattern of TRANSFER_PATTERNS) {
      if (pattern.test(tx.description)) {
        return { ...tx, category: 'Transfer', isTransfer: true, categorySource: 'rule' as const }
      }
    }

    const learned = findLearned(tx)
    // A rule the person made from a transaction is more specific than a merchant rule, so it goes first.
    // A rule without a subcategory leaves it to the merchant rule when both agree on the category.
    const custom = findRule(tx)

    if (custom) {
      let categoryDetail = custom.detail

      if (categoryDetail === undefined && learned?.category === custom.category) {
        categoryDetail = learned.detail
      }

      return {
        ...tx,
        category: custom.category,
        categoryDetail,
        categorySource: 'learned' as const,
      }
    }

    if (learned) {
      return { ...tx, category: learned.category, categoryDetail: learned.detail, categorySource: 'learned' as const }
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
