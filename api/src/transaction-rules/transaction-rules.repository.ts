import { Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { BANKING_CONFIG, BankingConfig } from '../bank-connections/config/bank-connections.tokens'
import { decrypt, encrypt } from '../shared/crypto/encryption'
import { ensureColumn } from '../shared/database/migrate'
import { DatabaseService } from '../shared/database/database.service'
import { RuleMatch } from './transaction-rules.schemas'

export interface TransactionRule {
  id: string
  match: RuleMatch
  category: string
  detail?: string
}

/**
 * Rules that say what a payment is from more than its merchant ("Aldi" plus "Prepaid-Konto" is a phone plan, not
 * groceries). Matching happens in the browser with the other categorizing, so the server only keeps them. The
 * conditions quote bank text, so they are encrypted like it; the category is the person's own word and stays plain.
 * Every query filters by user_id.
 */
@Injectable()
export class TransactionRulesRepository {
  private readonly q
  private readonly key: Buffer

  constructor(database: DatabaseService, @Inject(BANKING_CONFIG) config: BankingConfig) {
    const { db } = database

    this.key = config.encryptionKey
    db.exec(`
      CREATE TABLE IF NOT EXISTS transaction_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        match TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_transaction_rules_user ON transaction_rules(user_id, created_at);
    `)
    // Added later: older rules keep working and simply carry no subcategory
    ensureColumn(db, 'transaction_rules', 'detail', 'TEXT')
    this.q = {
      list: db.prepare(
        'SELECT id, category, detail, match FROM transaction_rules WHERE user_id = ? ORDER BY created_at',
      ),
      add: db.prepare(
        'INSERT INTO transaction_rules (id, user_id, category, detail, match, created_at) VALUES (?,?,?,?,?,?)',
      ),
      remove: db.prepare('DELETE FROM transaction_rules WHERE user_id = ? AND id = ?'),
    }
  }

  list(userId: string): TransactionRule[] {
    return (
      this.q.list.all(userId) as Array<{ id: string; category: string; detail: string | null; match: string }>
    ).map(r => ({
      id: r.id,
      category: r.category,
      ...(r.detail ? { detail: r.detail } : {}),
      match: JSON.parse(decrypt(r.match, this.key)) as RuleMatch,
    }))
  }

  add(userId: string, match: RuleMatch, category: string, detail?: string): TransactionRule {
    const id = randomUUID()

    this.q.add.run(
      id,
      userId,
      category,
      detail ?? null,
      encrypt(JSON.stringify(match), this.key),
      new Date().toISOString(),
    )

    return { id, match, category, ...(detail ? { detail } : {}) }
  }

  remove(userId: string, id: string): boolean {
    return this.q.remove.run(userId, id).changes > 0
  }
}
