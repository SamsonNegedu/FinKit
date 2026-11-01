import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../shared/database/database.service'
import { hasColumn } from '../shared/database/migrate'
import { UsersService } from '../users/users.service'

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

  constructor(
    private readonly database: DatabaseService,
    users: UsersService,
  ) {
    const { db } = database

    // Older databases had one global list. Rebuild it per user; the old rows wait for their owner.
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='merchant_categories'").get()) {
      if (!hasColumn(db, 'merchant_categories', 'user_id')) {
        db.exec(`
          ALTER TABLE merchant_categories RENAME TO merchant_categories_old;
          DROP INDEX IF EXISTS idx_merchant_key;
          DROP INDEX IF EXISTS idx_category;
        `)
        this.createTable()
        db.exec(`
          INSERT INTO merchant_categories (user_id, merchant_key, merchant_display, category, confidence, created_at, updated_at)
          SELECT NULL, merchant_key, merchant_display, category, confidence, created_at, updated_at FROM merchant_categories_old;
          DROP TABLE merchant_categories_old;
        `)
      }
    } else {
      this.createTable()
    }
    this.createIndexes()
    users.onLegacyOwnerCreated(userId =>
      db.prepare('UPDATE merchant_categories SET user_id = ? WHERE user_id IS NULL').run(userId),
    )
    this.upsert = db.prepare(`
      INSERT INTO merchant_categories (user_id, merchant_key, merchant_display, category, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, merchant_key) DO UPDATE SET
        category = excluded.category, confidence = confidence + 1, updated_at = CURRENT_TIMESTAMP
    `)
    this.all = db.prepare(`
      SELECT merchant_key as merchant, merchant_display, category, confidence
      FROM merchant_categories WHERE user_id = ? ORDER BY confidence DESC, updated_at DESC
    `)
    this.remove = db.prepare('DELETE FROM merchant_categories WHERE user_id = ? AND merchant_key = ?')
  }

  private createTable() {
    this.database.db.exec(`
      CREATE TABLE IF NOT EXISTS merchant_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        merchant_key TEXT NOT NULL,
        merchant_display TEXT NOT NULL,
        category TEXT NOT NULL,
        confidence INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, merchant_key)
      );
    `)
  }

  /**
   * UNIQUE (user_id, merchant_key) already indexes lookups by person and merchant, so the old
   * idx_merchant_user duplicate is dropped. These serve the list (best-known first), the
   * "recent" panel, and the per-category counts.
   */
  private createIndexes() {
    this.database.db.exec(`
      DROP INDEX IF EXISTS idx_merchant_user;
      CREATE INDEX IF NOT EXISTS idx_merchant_user_rank ON merchant_categories(user_id, confidence DESC, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_user_recent ON merchant_categories(user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_user_category ON merchant_categories(user_id, category);
    `)
  }

  save(userId: string, merchant: string, category: string): void {
    const key = normalizeMerchant(merchant)

    if (!key || key.length < 2) {
      return
    } // skip empty/short merchants
    this.upsert.run(userId, key, merchant, category)
  }

  saveMany(userId: string, rules: Array<{ merchant: string; category: string }>): void {
    this.database.db.transaction((items: typeof rules) =>
      items.forEach(r => this.save(userId, r.merchant, r.category)),
    )(rules)
  }

  findAll(userId: string): MerchantRule[] {
    return (
      this.all.all(userId) as Array<{
        merchant: string
        merchant_display: string
        category: string
        confidence: number
      }>
    ).map(r => ({
      merchant: r.merchant,
      merchantDisplay: r.merchant_display,
      category: r.category,
      confidence: r.confidence,
    }))
  }

  delete(userId: string, merchant: string): void {
    this.remove.run(userId, normalizeMerchant(merchant))
  }

  stats(userId: string) {
    const { db } = this.database
    const total = (
      db.prepare('SELECT COUNT(*) as count FROM merchant_categories WHERE user_id = ?').get(userId) as { count: number }
    ).count
    const topCategories = db
      .prepare(
        'SELECT category, COUNT(*) as count FROM merchant_categories WHERE user_id = ? GROUP BY category ORDER BY count DESC LIMIT 10',
      )
      .all(userId) as Array<{ category: string; count: number }>
    const recentMappings = db
      .prepare(
        'SELECT merchant_key as merchant, merchant_display, category, confidence FROM merchant_categories WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10',
      )
      .all(userId)

    return { total, topCategories, recentMappings }
  }
}
