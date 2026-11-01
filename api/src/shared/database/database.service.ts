import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Overrides the database file (tests pass ':memory:'). */
export const DATABASE_FILE = Symbol('DATABASE_FILE')

/**
 * The single SQLite connection. Feature modules own their tables and queries; this only
 * opens the database. Data lives in DATA_DIR (a mounted volume in production).
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: Database.Database

  constructor(@Optional() @Inject(DATABASE_FILE) file?: string) {
    const path = file ?? join(process.env.DATA_DIR || join(process.cwd(), 'data'), 'categorizations.db')

    if (path !== ':memory:' && !existsSync(dirname(path))) {
      mkdirSync(dirname(path), { recursive: true })
    }
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = 10000')
  }

  onModuleDestroy() {
    this.db.close()
  }
}
