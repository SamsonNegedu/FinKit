import { Transaction } from '@/shared/types'
import { merchantKeyOf, normalizeMerchant, cleanPayee } from './categorizer'
import { merchantFromDescription, shopBehindProcessor } from './merchantFromDescription'

// User-chosen display names for merchants, e.g. "AMZN Mktp DE*2K4" -> "Amazon".
// Only the shown name changes: grouping and learned rules keep using the original merchant.
const KEY = 'finkit.aliases'

type AliasMap = Record<string, string>

function loadAliases(): AliasMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveAlias(merchantKey: string, name: string | null): AliasMap {
  const aliases = loadAliases()
  const k = normalizeMerchant(merchantKey)

  if (name && name.trim()) {
    aliases[k] = name.trim()
  } else {
    delete aliases[k]
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(aliases))
  } catch {
    // preference just won't persist
  }

  return aliases
}

export function applyAliases(txs: Transaction[], aliases: AliasMap = loadAliases()): Transaction[] {
  return txs.map(t => {
    const name = aliases[normalizeMerchant(merchantKeyOf(t))]

    if (name) {
      return { ...t, displayName: name }
    }
    if (t.displayName) {
      return { ...t, displayName: undefined }
    }

    return t
  })
}

export function displayNameOf(t: Pick<Transaction, 'displayName' | 'merchant' | 'recipient' | 'description'>): string {
  // The shop behind PayPal or Klarna beats `merchant`: the anonymizer fills that with the processor's own name
  const fromText =
    shopBehindProcessor(t) ?? (t.merchant || t.recipient ? undefined : merchantFromDescription(t.description))

  const payee = t.merchant || t.recipient

  return t.displayName || fromText || (payee ? cleanPayee(payee) : t.description.slice(0, 40))
}
