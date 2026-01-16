import { Hono } from 'hono'
import { z } from 'zod'
import {
  getSettingValue,
  setSettingValue,
  getAllSettingsMap,
} from '../services/database'

const settingsRoute = new Hono()

// ============ Schema with Defaults ============

const CategoryMappingSchema = z.object({
  appCategory: z.string(),
  sheetColumn: z.string(),
})

// Default category mappings matching your Google Sheet structure
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

// Single source of truth: Schema with embedded defaults
const SheetConfigSchema = z.object({
  sheetId: z.string().default(''),
  tabName: z.string().default('2026'),
  monthColumn: z.string().default('A'),
  monthFormat: z.enum(['short', 'long', 'numeric']).default('short'),
  categoryMappings: z.array(CategoryMappingSchema).default(DEFAULT_CATEGORY_MAPPINGS),
  // Formula columns (auto-calculated, don't overwrite)
  constantColumns: z.array(z.string()).default(['S', 'U', 'X']),
  // Data columns we write to
  incomeColumn: z.string().default('T'),
  savingsColumn: z.string().default('V'),
  investmentColumn: z.string().default('W'),
})

// Infer the type from schema
type SheetConfig = z.infer<typeof SheetConfigSchema>

// Generate defaults by parsing empty object
const getDefaultConfig = (): SheetConfig => SheetConfigSchema.parse({})

// ============ Routes ============

// Get sheet config (merges stored values with defaults)
settingsRoute.get('/sheet', (c) => {
  const stored = getSettingValue<Partial<SheetConfig>>('sheetConfig', {})
  const config = SheetConfigSchema.parse(stored) // Applies defaults for missing fields
  
  return c.json({ success: true, data: config })
})

// Save sheet config
settingsRoute.post('/sheet', async (c) => {
  try {
    const body = await c.req.json()
    const config = SheetConfigSchema.parse(body)
    
    setSettingValue('sheetConfig', config)
    
    return c.json({ success: true, message: 'Settings saved' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400)
    }
    return c.json({ success: false, error: 'Invalid request' }, 400)
  }
})

// Reset to defaults
settingsRoute.delete('/sheet', (c) => {
  setSettingValue('sheetConfig', getDefaultConfig())
  return c.json({ success: true, message: 'Reset to defaults' })
})

// Get all settings
settingsRoute.get('/', (c) => {
  const stored = getAllSettingsMap()
  
  // Apply defaults to sheetConfig if present
  const sheetConfig = stored.sheetConfig 
    ? SheetConfigSchema.parse(stored.sheetConfig)
    : getDefaultConfig()
  
  return c.json({
    success: true,
    data: { ...stored, sheetConfig },
  })
})

// Generic key-value get/set
settingsRoute.get('/:key', (c) => {
  const key = c.req.param('key')
  const value = getSettingValue(key, null)
  
  if (value === null) {
    return c.json({ success: false, error: 'Not found' }, 404)
  }
  return c.json({ success: true, data: value })
})

settingsRoute.post('/:key', async (c) => {
  const key = c.req.param('key')
  const body = await c.req.json()
  
  setSettingValue(key, body.value ?? body)
  return c.json({ success: true })
})

export { settingsRoute }
