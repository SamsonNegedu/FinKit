import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../shared/database/database.service'

@Injectable()
export class SettingsRepository {
  private readonly selectOne
  private readonly upsertOne
  private readonly selectAll

  constructor(database: DatabaseService) {
    const { db } = database
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)
    this.selectOne = db.prepare('SELECT value FROM settings WHERE key = ?')
    this.upsertOne = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    this.selectAll = db.prepare('SELECT key, value FROM settings')
  }

  read<T>(key: string, fallback: T): T {
    const row = this.selectOne.get(key) as { value: string } | undefined
    if (!row) return fallback
    try {
      return JSON.parse(row.value) as T
    } catch {
      return fallback
    }
  }

  write<T>(key: string, value: T): void {
    this.upsertOne.run(key, JSON.stringify(value))
  }

  readAll(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const { key, value } of this.selectAll.all() as Array<{ key: string; value: string }>) {
      try {
        out[key] = JSON.parse(value)
      } catch {
        out[key] = value
      }
    }
    return out
  }
}
