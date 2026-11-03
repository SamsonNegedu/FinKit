import { getCategoryStyle } from './categoryStyle'

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Eating Out',
  'Personal Entertainment',
  'Subscriptions',
  'Car',
  'Public Transport',
  'Internet',
  'Electricity',
  'Insurance',
  'Travel',
  'Groceries',
  'Family',
  'Radio Tax',
  'Health & Wellbeing',
  'Shopping',
  'Other',
  'Gifts',
] as const

// Cash is here so it is always available: withdrawals default to it until you say what each was for
const SYSTEM_CATEGORIES = ['Income', 'Cash', 'Savings', 'Investment', 'Transfer']

export const RESERVED_CATEGORIES = SYSTEM_CATEGORIES

let activeExpenseCategories: string[] = [...EXPENSE_CATEGORIES]
let archivedCategories: string[] = []

export function setExpenseCategories(names: string[]): void {
  activeExpenseCategories = names.length > 0 ? [...names] : [...EXPENSE_CATEGORIES]
}

/** Categories put away: not offered when categorising, but still part of filters, charts and history. */
export function setArchivedCategories(names: string[]): void {
  archivedCategories = [...names]
}

export function getArchivedCategories(): string[] {
  return archivedCategories
}

/**
 * Everything a category filter should offer: what can be picked, what is archived, and anything still found on
 * transactions (one removed before archiving existed), so no year's categories become unreachable.
 */
export function getFilterCategories(inData: string[] = []): string[] {
  return [...new Set([...getAvailableCategories(), ...archivedCategories, ...inData])]
}

export function getExpenseCategories(): string[] {
  return activeExpenseCategories
}

export function getAvailableCategories(): string[] {
  return [...activeExpenseCategories, ...SYSTEM_CATEGORIES.filter(c => !activeExpenseCategories.includes(c))]
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#8b5cf6',
  'Eating Out': '#f59e0b',
  'Personal Entertainment': '#ec4899',
  Subscriptions: '#a855f7',
  Car: '#6366f1',
  'Public Transport': '#14b8a6',
  Internet: '#3b82f6',
  Electricity: '#f97316',
  Insurance: '#06b6d4',
  Travel: '#84cc16',
  Groceries: '#10b981',
  Family: '#f43f5e',
  'Radio Tax': '#7c3aed',
  'Health & Wellbeing': '#22c55e',
  Shopping: '#fb7185',
  Other: '#64748b',
  Gifts: '#e11d48',
  Income: '#10b981',
  Savings: '#0ea5e9',
  Investment: '#0284c7',
  Cash: '#a3a380',
  Transfer: '#94a3b8',
}

export function getCategoryColor(category: string | undefined): string {
  const name = category || 'Other'
  const chosen = getCategoryStyle(name)?.color

  if (chosen) {
    return chosen
  }

  if (CATEGORY_COLORS[name]) {
    return CATEGORY_COLORS[name]
  }
  let hash = 0

  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  const h = hash % 360,
    sat = 0.65,
    l = 0.55
  const a = sat * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))

    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0')
  }

  return `#${f(0)}${f(8)}${f(4)}`
}
