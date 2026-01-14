import { Hono } from 'hono'
import { z } from 'zod'
import { categorizeWithAI } from '../services/openai'
import { validateAnonymized } from '../lib/anonymizer'

const categorizeRoute = new Hono()

const TransactionSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  date: z.string(),
  category: z.string().optional(),
})

const CategorizeRequestSchema = z.object({
  transactions: z.array(TransactionSchema),
})

categorizeRoute.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CategorizeRequestSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400)
    }

    const { transactions } = parsed.data

    // Validate that data is anonymized before processing
    const anonymizationCheck = validateAnonymized(transactions)
    if (!anonymizationCheck.isValid) {
      return c.json({ 
        error: 'Data contains non-anonymized personal information',
        details: anonymizationCheck.issues 
      }, 400)
    }

    // Call OpenAI for categorization
    const categorized = await categorizeWithAI(transactions)
    
    return c.json({ 
      success: true, 
      data: categorized 
    })
  } catch (error) {
    console.error('Categorization error:', error)
    return c.json({ error: 'Failed to categorize transactions' }, 500)
  }
})

export { categorizeRoute }
