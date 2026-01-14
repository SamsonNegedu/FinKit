import { Hono } from 'hono'
import { z } from 'zod'
import { exportToSheets, verifySheetStructure, getSheetMetadata } from '../services/sheets'

const exportRoute = new Hono()

const CategoryValueSchema = z.object({
  column: z.string(),
  value: z.number(),
})

const ExportRequestSchema = z.object({
  sheetId: z.string(),
  tabName: z.string(),
  month: z.string(),
  monthFormat: z.enum(['short', 'long', 'numeric']),
  categoryValues: z.array(CategoryValueSchema),
  income: z.number(),
  savings: z.number().optional(),
  investment: z.number().optional(),
  constantColumns: z.array(z.string()).optional(),
})

// Export data to Google Sheets
exportRoute.post('/sheets', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = ExportRequestSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400)
    }

    const result = await exportToSheets(parsed.data)
    
    return c.json({ 
      success: true, 
      data: result 
    })
  } catch (error) {
    console.error('Export error:', error)
    const message = error instanceof Error ? error.message : 'Failed to export to Google Sheets'
    return c.json({ error: message }, 500)
  }
})

// Verify sheet structure matches expected format
exportRoute.post('/verify', async (c) => {
  try {
    const body = await c.req.json()
    const { sheetId, tabName } = body
    
    if (!sheetId || !tabName) {
      return c.json({ error: 'Missing sheetId or tabName' }, 400)
    }

    const result = await verifySheetStructure(sheetId, tabName)
    
    return c.json({ 
      success: true, 
      data: result 
    })
  } catch (error) {
    console.error('Verify error:', error)
    const message = error instanceof Error ? error.message : 'Failed to verify sheet structure'
    return c.json({ error: message }, 500)
  }
})

// Get sheet metadata (available tabs)
exportRoute.post('/sheets/metadata', async (c) => {
  try {
    const body = await c.req.json()
    const { sheetId } = body
    
    if (!sheetId) {
      return c.json({ error: 'Missing sheetId' }, 400)
    }

    const result = await getSheetMetadata(sheetId)
    
    return c.json({ 
      success: true, 
      data: result 
    })
  } catch (error) {
    console.error('Metadata error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch sheet metadata'
    return c.json({ error: message }, 500)
  }
})

export { exportRoute }
