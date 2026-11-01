import { Inject, Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { DatabaseService } from '../../shared/database/database.service'
import { decrypt, encrypt } from '../../shared/crypto/encryption'
import { BankTransaction } from '../providers/bank-provider'
import { BANKING_CONFIG, BankingConfig } from '../config/bank-connections.tokens'

/**
 * Synced transactions, kept per person. Every query filters by user_id; nothing here takes an
 * identity from a request. Date, amount and currency stay readable so ranges can be queried; the
 * descriptive parts (text, names, IBANs, account details) are encrypted at rest.
 */
@Injectable()
export class BankTransactionsStore {
  private readonly q
  private readonly key: Buffer

  constructor(database: DatabaseService, @Inject(BANKING_CONFIG) config: BankingConfig) {
    const { db } = database

    this.key = config.encryptionKey
    db.exec(`
      CREATE TABLE IF NOT EXISTS bank_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        ext_key TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_tx_unique ON bank_transactions(user_id, ext_key);
      CREATE INDEX IF NOT EXISTS idx_bank_tx_user_date ON bank_transactions(user_id, date);
    `)
    this.q = {
      insert: db.prepare(
        `INSERT OR IGNORE INTO bank_transactions (user_id, connection_id, ext_key, date, amount, currency, payload, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
      ),
      list: db.prepare(
        'SELECT * FROM bank_transactions WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date DESC, id DESC',
      ),
      count: db.prepare('SELECT COUNT(*) AS n FROM bank_transactions WHERE user_id = ?'),
      move: db.prepare('UPDATE bank_transactions SET connection_id = ? WHERE user_id = ? AND connection_id = ?'),
      deleteConn: db.prepare('DELETE FROM bank_transactions WHERE user_id = ? AND connection_id = ?'),
      deleteAll: db.prepare('DELETE FROM bank_transactions WHERE user_id = ?'),
    }
    this.insertMany = db.transaction((userId: string, connectionId: string, txs: BankTransaction[]) => {
      let added = 0

      for (const tx of txs) {
        const { date, amount, currency, ...rest } = tx

        added += this.q.insert.run(
          userId,
          connectionId,
          extKey(tx),
          date,
          amount,
          currency,
          encrypt(JSON.stringify(rest), this.key),
          new Date().toISOString(),
        ).changes
      }

      return added
    })
  }

  private readonly insertMany: (userId: string, connectionId: string, txs: BankTransaction[]) => number

  /** Stores what is new and ignores what is already there. Returns how many were new. */
  save(userId: string, connectionId: string, txs: BankTransaction[]): number {
    return this.insertMany(userId, connectionId, txs)
  }

  list(userId: string, from = '0000-01-01', to = '9999-12-31'): BankTransaction[] {
    const rows = this.q.list.all(userId, from, to) as Array<{
      date: string
      amount: number
      currency: string
      payload: string
    }>

    return rows.map(r => ({
      ...(JSON.parse(decrypt(r.payload, this.key)) as Omit<BankTransaction, 'date' | 'amount' | 'currency'>),
      date: r.date,
      amount: r.amount,
      currency: r.currency,
    }))
  }

  count(userId: string): number {
    return (this.q.count.get(userId) as { n: number }).n
  }

  /** A reconnect makes a new connection for the same accounts: keep the history under the new one. */
  moveConnection(userId: string, from: string, to: string) {
    this.q.move.run(to, userId, from)
  }

  deleteForConnection(userId: string, connectionId: string): number {
    return this.q.deleteConn.run(userId, connectionId).changes
  }

  deleteAll(userId: string): number {
    return this.q.deleteAll.run(userId).changes
  }
}

/** The bank's own id when there is one; otherwise a fingerprint of the row, so repeats are still skipped. */
function extKey(tx: BankTransaction): string {
  return (
    tx.externalId ??
    `h:${createHash('sha256')
      .update([tx.accountRef ?? '', tx.date, tx.amount, tx.description, tx.recipient ?? ''].join('|'))
      .digest('hex')
      .slice(0, 32)}`
  )
}
