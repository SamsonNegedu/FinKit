import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { DatabaseService } from '../shared/database/database.service'
import { hasColumn } from '../shared/database/migrate'

export interface UserRow {
  id: string
  email: string
  created_at: string
  last_seen_at: string
}

/** The people who use this FinKit. Identity comes from the sign-in (Cloudflare Access), never from a password here. */
@Injectable()
export class UsersRepository {
  private readonly byEmail
  private readonly insert
  private readonly touchSeen

  constructor(database: DatabaseService) {
    const { db } = database

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
    `)
    // An earlier version marked an "owner" here. Everyone is equal now.
    if (hasColumn(db, 'users', 'is_owner')) {
      db.exec('ALTER TABLE users DROP COLUMN is_owner')
    }
    this.byEmail = db.prepare('SELECT * FROM users WHERE email = ?')
    this.insert = db.prepare('INSERT INTO users (id, email, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
    this.touchSeen = db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?')
  }

  findByEmail(email: string) {
    return this.byEmail.get(email) as UserRow | undefined
  }

  create(email: string): UserRow {
    const now = new Date().toISOString()
    const row = { id: randomUUID(), email, created_at: now, last_seen_at: now }

    this.insert.run(row.id, row.email, row.created_at, row.last_seen_at)

    return row
  }

  touch(id: string) {
    this.touchSeen.run(new Date().toISOString(), id)
  }
}
