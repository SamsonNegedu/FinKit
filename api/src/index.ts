import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { categorizeRoute } from './routes/categorize'
import { exportRoute } from './routes/export'
import { learnRoute } from './routes/learn'
import { settingsRoute } from './routes/settings'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: process.env.NODE_ENV === 'production' 
    ? '*'  // Allow all origins in production
    : ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes - authentication handled by Cloudflare Access at edge
app.route('/api/categorize', categorizeRoute)
app.route('/api/export', exportRoute)
app.route('/api/learn', learnRoute)
app.route('/api/settings', settingsRoute)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

const port = Number(process.env.PORT) || 3003
console.log(`Server starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server running at http://localhost:${port}`)
