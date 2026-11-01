import { z } from 'zod'

const CategoryMappingSchema = z.object({ appCategory: z.string(), sheetColumn: z.string() })

// One column of the Google Sheet's header row, read from the sheet (or pasted by the user)
const SheetColumnSchema = z.object({
  column: z.string(),
  name: z.string(),
  kind: z.enum(['month', 'category', 'total', 'income', 'incomeAfter', 'savings', 'investment', 'net', 'other']),
})

// Default category mappings matching the original sheet structure
const DEFAULT_CATEGORY_MAPPINGS = [
  { appCategory: 'Rent', sheetColumn: 'B' },
  { appCategory: 'Eating Out', sheetColumn: 'C' },
  { appCategory: 'Personal Entertainment', sheetColumn: 'D' },
  { appCategory: 'Subscriptions', sheetColumn: 'E' },
  { appCategory: 'Car', sheetColumn: 'F' },
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

// Single source of truth: the schema carries the defaults
export const SheetConfigSchema = z.object({
  sheetId: z.string().default(''),
  tabName: z.string().default('2026'),
  monthColumn: z.string().default('A'),
  monthFormat: z.enum(['short', 'long', 'numeric']).default('short'),
  categoryMappings: z.array(CategoryMappingSchema).default(DEFAULT_CATEGORY_MAPPINGS),
  constantColumns: z.array(z.string()).default(['S', 'U', 'X']), // formula columns: don't overwrite
  incomeColumn: z.string().default('T'),
  savingsColumn: z.string().default('V'),
  investmentColumn: z.string().default('W'),
  layout: z.array(SheetColumnSchema).optional(), // synced from the sheet; undefined until first sync
  headerRow: z.number().optional(),
  layoutSyncedAt: z.number().optional(),
})
export type SheetConfig = z.infer<typeof SheetConfigSchema>
export const defaultSheetConfig = (): SheetConfig => SheetConfigSchema.parse({})
