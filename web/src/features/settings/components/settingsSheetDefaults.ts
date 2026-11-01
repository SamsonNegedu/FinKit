import { CategoryMapping } from '@/shared/types'

// Default column mappings matching your Google Sheet structure:
// Month | Rent | Eating Out | Personal Entertainment | Subscriptions | Car(Miles) | Public Transport |
// Internet | Electricity | Insurance | Travel | Groceries | Family | Radio Tax | Health & Wellbeing |
// Shopping | Other | Gifts | Total Expenditure | Income | Income After Expenditure | Gross Savings |
// Gross Investment | Net Income
export const DEFAULT_MAPPINGS: CategoryMapping[] = [
  { appCategory: 'Rent', sheetColumn: 'B' },
  { appCategory: 'Eating Out', sheetColumn: 'C' },
  { appCategory: 'Personal Entertainment', sheetColumn: 'D' },
  { appCategory: 'Subscriptions', sheetColumn: 'E' },
  { appCategory: 'Car', sheetColumn: 'F' }, // Car(Miles)
  { appCategory: 'Public Transport', sheetColumn: 'G' },
  { appCategory: 'Internet', sheetColumn: 'H' },
  { appCategory: 'Electricity', sheetColumn: 'I' },
  { appCategory: 'Insurance', sheetColumn: 'J' },
  { appCategory: 'Travel', sheetColumn: 'K' },
  { appCategory: 'Groceries', sheetColumn: 'L' },
  { appCategory: 'Family', sheetColumn: 'M' },
  { appCategory: 'Radio Tax', sheetColumn: 'N' },
  { appCategory: 'Health & Wellbeing', sheetColumn: 'O' },
  { appCategory: 'Shopping', sheetColumn: 'P' },
  { appCategory: 'Other', sheetColumn: 'Q' },
  { appCategory: 'Gifts', sheetColumn: 'R' },
]

// Columns that are calculated formulas and should not be overwritten
export const DEFAULT_CONSTANTS = ['S', 'T', 'U', 'V', 'W', 'X'] // Total Expenditure, Income, etc.
