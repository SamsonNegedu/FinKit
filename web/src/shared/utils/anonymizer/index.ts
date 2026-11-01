import type { AnonymizedData, RawTransaction, Transaction } from '@/shared/types'
import { anonymizationStore, anonymizeText } from './store'
import { cleanMerchantName, isLikelyBusiness } from './constants'

export function anonymizeTransactions(rawTransactions: RawTransaction[]): AnonymizedData {
  anonymizationStore.clear()

  const personalNames = new Set<string>()
  for (const tx of rawTransactions) {
    if (tx.recipient && tx.recipient.length > 3 && !isLikelyBusiness(tx.recipient)) {
      personalNames.add(tx.recipient)
    }
  }

  const transactions: Transaction[] = rawTransactions.map((raw, index) => {
    const anonymizedRecipient = raw.recipient
      ? isLikelyBusiness(raw.recipient)
        ? raw.recipient
        : anonymizationStore.getOrCreate(raw.recipient, 'name')
      : undefined

    const anonymizedIban = raw.recipientIban ? anonymizationStore.getOrCreate(raw.recipientIban, 'iban') : undefined
    const referenceAccount = raw.referenceAccount
    const anonymizedDescription = anonymizeText(raw.description, personalNames)
    const merchant = raw.recipient && isLikelyBusiness(raw.recipient) ? cleanMerchantName(raw.recipient) : undefined

    return {
      ...raw,
      id: `tx_${Date.now()}_${index}`,
      recipient: anonymizedRecipient,
      recipientIban: anonymizedIban,
      referenceAccount,
      description: anonymizedDescription,
      merchant,
      type: raw.amount < 0 ? 'expense' : 'income',
      amount: Math.abs(raw.amount),
      categorySource: raw.category ? 'rule' : undefined,
    } as Transaction
  })

  return {
    transactions,
    mappings: anonymizationStore.getAllMappings(),
  }
}

export function processWithoutAnonymization(rawTransactions: RawTransaction[]): Transaction[] {
  return rawTransactions.map((raw, index) => {
    const merchant = raw.recipient && isLikelyBusiness(raw.recipient) ? cleanMerchantName(raw.recipient) : undefined

    return {
      ...raw,
      id: `tx_${Date.now()}_${index}`,
      merchant,
      type: raw.amount < 0 ? 'expense' : 'income',
      amount: Math.abs(raw.amount),
      categorySource: raw.category ? 'rule' : undefined,
    } as Transaction
  })
}
