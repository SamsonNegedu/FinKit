import { getCategoryColor } from '@/shared/utils/categorizer'

// Trip categories have their own names, so the built-in ones get fixed colors here; anything a person adds
// falls back to the same name-based color the monthly categories use, so it stays the same everywhere.
const TRIP_COLORS: Record<string, string> = {
  Accommodation: '#6366f1',
  Transport: '#14b8a6',
  'Food & drink': '#f59e0b',
  Activities: '#ec4899',
  Shopping: '#fb7185',
  Souvenir: '#a855f7',
  Other: '#64748b',
}

export const FUNDING_COLOR = '#10b981'

export const tripCategoryColor = (name: string): string => TRIP_COLORS[name] ?? getCategoryColor(name)
