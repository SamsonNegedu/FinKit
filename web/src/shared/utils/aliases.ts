import { Transaction } from '@/shared/types'
import { merchantKeyOf, normalizeMerchant } from './categorizer'

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

    return name ? { ...t, displayName: name } : t.displayName ? { ...t, displayName: undefined } : t
  })
}

export function displayNameOf(t: Pick<Transaction, 'displayName' | 'merchant' | 'recipient' | 'description'>): string {
  return t.displayName || t.merchant || t.recipient || t.description.slice(0, 40)
}
