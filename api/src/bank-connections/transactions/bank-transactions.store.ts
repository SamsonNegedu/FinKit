import { Inject, Injectable } from '@nestjs/common'
import { createHmac } from 'node:crypto'
import { DatabaseService } from '../../shared/database/database.service'
import { decrypt, encrypt } from '../../shared/crypto/encryption'
import { hasColumn } from '../../shared/database/migrate'
import { BankTransaction } from '../providers/bank-provider'
import { BANKING_CONFIG, BankingConfig } from '../config/bank-connections.tokens'

/**
 * Synced transactions, kept per person. Every query filters by user_id; nothing here takes an
 * identity from a request. Everything about a transaction (date, amount, text, names, IBANs,
 * account details) is encrypted in one value. What stays readable is only who owns the row, which
 * connection it came from, when it was stored, and an opaque key used to skip repeats.
 */
@Injectable()
export class BankTransactionsStore {
  private readonly q
  private readonly key: Buffer
  private readonly dedupeKey: Buffer

  constructor(database: DatabaseService, @Inject(BANKING_CONFIG) config: BankingConfig) {
    const { db } = database

    this.key = config.encryptionKey
    // A separate key for the repeat-skipping fingerprint, so it never reveals what a row contains
    this.dedupeKey = createHmac('sha256', this.key).update('finkit:tx-dedupe').digest()
    const upgrade = hasColumn(db, 'bank_transactions', 'date')

    if (upgrade) {
      // Older layout kept date, amount and currency readable: set it aside and move the rows over
      db.exec(`
        ALTER TABLE bank_transactions RENAME TO bank_transactions_v1;
        DROP INDEX IF EXISTS idx_bank_tx_unique;
        DROP INDEX IF EXISTS idx_bank_tx_user_date;
      `)
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS bank_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        ext_key TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_tx_unique ON bank_transactions(user_id, ext_key);
    `)
    this.q = {
      insert: db.prepare(
        `INSERT OR IGNORE INTO bank_transactions (user_id, connection_id, ext_key, payload, created_at)
         VALUES (?,?,?,?,?)`,
      ),
      list: db.prepare('SELECT payload FROM bank_transactions WHERE user_id = ? ORDER BY id DESC'),
      count: db.prepare('SELECT COUNT(*) AS n FROM bank_transactions WHERE user_id = ?'),
      move: db.prepare('UPDATE bank_transactions SET connection_id = ? WHERE user_id = ? AND connection_id = ?'),
      deleteConn: db.prepare('DELETE FROM bank_transactions WHERE user_id = ? AND connection_id = ?'),
      deleteAll: db.prepare('DELETE FROM bank_transactions WHERE user_id = ?'),
    }
    this.insertMany = db.transaction((userId: string, connectionId: string, txs: BankTransaction[]) => {
      let added = 0

      for (const tx of txs) {
        added += this.q.insert.run(
          userId,
          connectionId,
          this.fingerprint(tx),
          encrypt(JSON.stringify(tx), this.key),
          new Date().toISOString(),
        ).changes
      }

      return added
    })
    if (upgrade) {
      db.transaction(() => {
        const old = db.prepare('SELECT * FROM bank_transactions_v1 ORDER BY id').all() as Array<{
          user_id: string
          connection_id: string
          date: string
          amount: number
          currency: string
          payload: string
          created_at: string
        }>

        for (const r of old) {
          const tx = {
            ...JSON.parse(decrypt(r.payload, this.key)),
            date: r.date,
            amount: r.amount,
            currency: r.currency,
          } as BankTransaction

          this.q.insert.run(
            r.user_id,
            r.connection_id,
            this.fingerprint(tx),
            encrypt(JSON.stringify(tx), this.key),
            r.created_at,
          )
        }
        db.exec('DROP TABLE bank_transactions_v1')
      })()
    }
  }

  private readonly insertMany: (userId: string, connectionId: string, txs: BankTransaction[]) => number

  /** Stores what is new and ignores what is already there. Returns how many were new. */
  save(userId: string, connectionId: string, txs: BankTransaction[]): number {
    return this.insertMany(userId, connectionId, txs)
  }

  /** Newest first. The date range is applied after decrypting, because dates are not readable in the database. */
  list(userId: string, from = '0000-01-01', to = '9999-12-31'): BankTransaction[] {
    const rows = this.q.list.all(userId) as Array<{ payload: string }>

    return rows
      .map(r => JSON.parse(decrypt(r.payload, this.key)) as BankTransaction)
      .filter(t => t.date >= from && t.date <= to)
      .toSorted((a, b) => b.date.localeCompare(a.date)) // stable: same-day rows keep newest-stored first
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

  /**
   * An opaque id used to skip repeats: the bank's own reference when there is one, otherwise the
   * row's content. Keyed, so neither an IBAN inside a reference nor a guessable payment can be read from it.
   */
  private fingerprint(tx: BankTransaction): string {
    const material = tx.externalId
      ? `e:${tx.externalId}`
      : `h:${[tx.accountRef ?? '', tx.date, tx.amount, tx.description, tx.recipient ?? ''].join('|')}`

    return createHmac('sha256', this.dedupeKey).update(material).digest('hex')
  }
}
