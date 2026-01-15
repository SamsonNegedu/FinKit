import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Data directory for persistent storage
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '../../data')
const DB_PATH = join(DATA_DIR, 'categorizations.db')

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize database
const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read/write performance
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('cache_size = 10000')

// Create table with proper constraints
// Uses normalized merchant_key for deduplication
db.exec(`
  CREATE TABLE IF NOT EXISTS merchant_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_key TEXT NOT NULL UNIQUE,      -- Normalized key for dedup
    merchant_display TEXT NOT NULL,          -- Original display name
    category TEXT NOT NULL,
    confidence INTEGER DEFAULT 1,            -- Times user confirmed this
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Index for fast lookups
  CREATE INDEX IF NOT EXISTS idx_merchant_key ON merchant_categories(merchant_key);
  CREATE INDEX IF NOT EXISTS idx_category ON merchant_categories(category);
`)

// ============ Normalization ============
// Note: Frontend also has this same normalization function
// They MUST match for consistent storage and retrieval

function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
    .replace(/\s+/g, ' ')          // Multiple spaces → single space
    .trim()
}

// ============ Prepared Statements ============

const insertOrUpdateMapping = db.prepare(`
  INSERT INTO merchant_categories (merchant_key, merchant_display, category, updated_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(merchant_key) DO UPDATE SET
    category = excluded.category,
    confidence = confidence + 1,
    updated_at = CURRENT_TIMESTAMP
`)

const getAllMappings = db.prepare(`
  SELECT merchant_key as merchant, merchant_display, category, confidence
  FROM merchant_categories
  ORDER BY confidence DESC, updated_at DESC
`)

const getMapping = db.prepare(`
  SELECT category, confidence, merchant_display
  FROM merchant_categories
  WHERE merchant_key = ?
`)

const deleteMapping = db.prepare(`
  DELETE FROM merchant_categories
  WHERE merchant_key = ?
`)

// ============ Export Types ============

export interface MerchantMapping {
  merchant: string
  merchantDisplay?: string
  category: string
  confidence: number
}

// ============ Core Functions ============

/**
 * Save a merchant → category mapping
 * - Normalizes merchant name for deduplication
 * - Uses UPSERT: inserts new or increments confidence if exists
 */
export function saveMerchantCategory(merchant: string, category: string): void {
  const key = normalizeMerchant(merchant)
  if (!key || key.length < 2) return // Skip empty/short merchants
  
  insertOrUpdateMapping.run(key, merchant, category)
}

/**
 * Get category for a specific merchant (exact normalized match)
 * Note: Fuzzy matching is handled by frontend
 */
export function getMerchantCategory(merchant: string): string | null {
  const key = normalizeMerchant(merchant)
  const result = getMapping.get(key) as { category: string } | undefined
  return result?.category ?? null
}

/**
 * Get all merchant → category mappings
 * Frontend loads these once and does its own fuzzy matching
 */
export function getAllMerchantMappings(): MerchantMapping[] {
  const results = getAllMappings.all() as Array<{
    merchant: string
    merchant_display: string
    category: string
    confidence: number
  }>
  
  return results.map(r => ({
    merchant: r.merchant,
    merchantDisplay: r.merchant_display,
    category: r.category,
    confidence: r.confidence,
  }))
}

/**
 * Delete a merchant mapping
 */
export function deleteMerchantMapping(merchant: string): void {
  const key = normalizeMerchant(merchant)
  deleteMapping.run(key)
}

/**
 * Batch save mappings (wrapped in transaction for efficiency)
 */
export function saveBatchMappings(mappings: Array<{ merchant: string; category: string }>): void {
  const transaction = db.transaction((items: typeof mappings) => {
    for (const { merchant, category } of items) {
      saveMerchantCategory(merchant, category)
    }
  })
  transaction(mappings)
}

// ============ Stats ============

export function getMappingStats(): { 
  total: number
  topCategories: Array<{ category: string; count: number }>
  recentMappings: MerchantMapping[]
} {
  const total = (db.prepare('SELECT COUNT(*) as count FROM merchant_categories').get() as { count: number }).count
  
  const topCategories = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM merchant_categories
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `).all() as Array<{ category: string; count: number }>
  
  const recentMappings = db.prepare(`
    SELECT merchant_key as merchant, merchant_display, category, confidence
    FROM merchant_categories
    ORDER BY updated_at DESC
    LIMIT 10
  `).all() as MerchantMapping[]
  
  return { total, topCategories, recentMappings }
}

// ============ Maintenance ============

export function optimizeDatabase(): void {
  db.pragma('optimize')
}

export function closeDatabase(): void {
  db.close()
}
