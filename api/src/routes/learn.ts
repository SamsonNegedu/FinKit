import { Hono } from 'hono'
import { z } from 'zod'
import {
  saveMerchantCategory,
  getAllMerchantMappings,
  deleteMerchantMapping,
  saveBatchMappings,
  getMappingStats,
} from '../services/database'

const learnRoute = new Hono()

// Schema for saving a single mapping
const SaveMappingSchema = z.object({
  merchant: z.string().min(1),
  category: z.string().min(1),
})

// Schema for batch save
const BatchSaveSchema = z.object({
  mappings: z.array(SaveMappingSchema),
})

// Get all learned mappings
learnRoute.get('/mappings', (c) => {
  try {
    const mappings = getAllMerchantMappings()
    return c.json({
      success: true,
      data: mappings,
    })
  } catch (error) {
    console.error('Failed to get mappings:', error)
    return c.json({ error: 'Failed to get mappings' }, 500)
  }
})

// Get stats about learned mappings
learnRoute.get('/stats', (c) => {
  try {
    const stats = getMappingStats()
    return c.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Failed to get stats:', error)
    return c.json({ error: 'Failed to get stats' }, 500)
  }
})

// Save a single merchant → category mapping
learnRoute.post('/mapping', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = SaveMappingSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', details: parsed.error.issues }, 400)
    }
    
    const { merchant, category } = parsed.data
    saveMerchantCategory(merchant, category)
    
    return c.json({
      success: true,
      message: `Learned: "${merchant}" → "${category}"`,
    })
  } catch (error) {
    console.error('Failed to save mapping:', error)
    return c.json({ error: 'Failed to save mapping' }, 500)
  }
})

// Save multiple mappings at once
learnRoute.post('/mappings/batch', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = BatchSaveSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ error: 'Invalid request', details: parsed.error.issues }, 400)
    }
    
    saveBatchMappings(parsed.data.mappings)
    
    return c.json({
      success: true,
      message: `Saved ${parsed.data.mappings.length} mappings`,
    })
  } catch (error) {
    console.error('Failed to save batch mappings:', error)
    return c.json({ error: 'Failed to save batch mappings' }, 500)
  }
})

// Delete a mapping
learnRoute.delete('/mapping/:merchant', (c) => {
  try {
    const merchant = decodeURIComponent(c.req.param('merchant'))
    deleteMerchantMapping(merchant)
    
    return c.json({
      success: true,
      message: `Deleted mapping for "${merchant}"`,
    })
  } catch (error) {
    console.error('Failed to delete mapping:', error)
    return c.json({ error: 'Failed to delete mapping' }, 500)
  }
})

export { learnRoute }
