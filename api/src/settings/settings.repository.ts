import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../shared/database/database.service'
import { hasColumn } from '../shared/database/migrate'
import { UsersService } from '../users/users.service'

/** One person's saved preferences. Every row belongs to a user. */
@Injectable()
export class SettingsRepository {
  private readonly selectOne
  private readonly upsertOne
  private readonly selectAll

  constructor(
    private readonly database: DatabaseService,
    users: UsersService,
  ) {
    const { db } = database

    // Older databases kept one global list. Rebuild it per user; the old rows wait for their owner.
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").get()) {
      if (!hasColumn(db, 'settings', 'user_id')) {
        db.exec('ALTER TABLE settings RENAME TO settings_old')
        this.createTable()
        db.exec(`
          INSERT INTO settings (user_id, key, value, updated_at)
          SELECT NULL, key, value, updated_at FROM settings_old;
          DROP TABLE settings_old;
        `)
      }
    } else {
      this.createTable()
    }
    users.onLegacyOwnerCreated(userId =>
      db.prepare('UPDATE settings SET user_id = ? WHERE user_id IS NULL').run(userId),
    )
    this.selectOne = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?')
    this.upsertOne = db.prepare(`
      INSERT INTO settings (user_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    this.selectAll = db.prepare('SELECT key, value FROM settings WHERE user_id = ?')
  }

  private createTable() {
    this.database.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, key)
      );
    `)
  }

  read<T>(userId: string, key: string, fallback: T): T {
    const row = this.selectOne.get(userId, key) as { value: string } | undefined

    if (!row) {
      return fallback
    }
    try {
      return JSON.parse(row.value) as T
    } catch {
      return fallback
    }
  }

  write<T>(userId: string, key: string, value: T): void {
    this.upsertOne.run(userId, key, JSON.stringify(value))
  }

  readAll(userId: string): Record<string, unknown> {
    const out: Record<string, unknown> = {}

    for (const { key, value } of this.selectAll.all(userId) as Array<{
      key: string
      value: string
    }>) {
      try {
        out[key] = JSON.parse(value)
      } catch {
        out[key] = value
      }
    }

    return out
  }
}
