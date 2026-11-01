import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../shared/database/database.service'

interface MerchantRule {
  merchant: string
  merchantDisplay?: string
  category: string
  confidence: number
}

// Frontend also has this normalization function. They MUST match for consistent storage and retrieval.
function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

@Injectable()
export class MerchantRulesRepository {
  private readonly upsert
  private readonly all
  private readonly remove

  constructor(private readonly database: DatabaseService) {
    const { db } = database
    db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        merchant_key TEXT NOT NULL UNIQUE,
        merchant_display TEXT NOT NULL,
        category TEXT NOT NULL,
        confidence INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_key ON merchant_categories(merchant_key);
      CREATE INDEX IF NOT EXISTS idx_category ON merchant_categories(category);
    `)
    this.upsert = db.prepare(`
      INSERT INTO merchant_categories (merchant_key, merchant_display, category, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(merchant_key) DO UPDATE SET
        category = excluded.category, confidence = confidence + 1, updated_at = CURRENT_TIMESTAMP
    `)
    this.all = db.prepare(`
      SELECT merchant_key as merchant, merchant_display, category, confidence
      FROM merchant_categories ORDER BY confidence DESC, updated_at DESC
    `)
    this.remove = db.prepare('DELETE FROM merchant_categories WHERE merchant_key = ?')
  }

  save(merchant: string, category: string): void {
    const key = normalizeMerchant(merchant)
    if (!key || key.length < 2) return // skip empty/short merchants
    this.upsert.run(key, merchant, category)
  }

  saveMany(rules: Array<{ merchant: string; category: string }>): void {
    this.database.db.transaction((items: typeof rules) => items.forEach(r => this.save(r.merchant, r.category)))(rules)
  }

  findAll(): MerchantRule[] {
    return (
      this.all.all() as Array<{ merchant: string; merchant_display: string; category: string; confidence: number }>
    ).map(r => ({
      merchant: r.merchant,
      merchantDisplay: r.merchant_display,
      category: r.category,
      confidence: r.confidence,
    }))
  }

  delete(merchant: string): void {
    this.remove.run(normalizeMerchant(merchant))
  }

  stats() {
    const { db } = this.database
    const total = (db.prepare('SELECT COUNT(*) as count FROM merchant_categories').get() as { count: number }).count
    const topCategories = db
      .prepare(
        'SELECT category, COUNT(*) as count FROM merchant_categories GROUP BY category ORDER BY count DESC LIMIT 10',
      )
      .all() as Array<{ category: string; count: number }>
    const recentMappings = db
      .prepare(
        'SELECT merchant_key as merchant, merchant_display, category, confidence FROM merchant_categories ORDER BY updated_at DESC LIMIT 10',
      )
      .all()
    return { total, topCategories, recentMappings }
  }
}
