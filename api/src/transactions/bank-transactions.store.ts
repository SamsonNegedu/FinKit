import { Inject, Injectable } from '@nestjs/common'
import { createHmac } from 'node:crypto'
import { DatabaseService } from '../shared/database/database.service'
import { decrypt, encrypt } from '../shared/crypto/encryption'
import { ensureColumn, hasColumn } from '../shared/database/migrate'
import { BankTransaction } from '../bank-connections/providers/bank-provider'
import { BANKING_CONFIG, BankingConfig } from '../bank-connections/config/bank-connections.tokens'

/**
 * Synced transactions, kept per person. Every query filters by user_id; nothing here takes an
 * identity from a request. Everything about a transaction (amount, text, names, IBANs, account
 * details) is encrypted in one value. What stays readable is who owns the row, which connection it
 * came from, when it was stored, an opaque key used to skip repeats, and the booking date (tx_date).
 * The date is readable on purpose: it lets the database filter and sort by range, so a read only
 * decrypts the rows it returns instead of every row the person has ever synced.
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
        created_at TEXT NOT NULL,
        tx_date TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_tx_unique ON bank_transactions(user_id, ext_key);
    `)
    // Rows stored before tx_date existed get it filled in below
    ensureColumn(db, 'bank_transactions', 'tx_date', 'TEXT')
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bank_tx_user_txdate ON bank_transactions(user_id, tx_date DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_bank_tx_user_conn ON bank_transactions(user_id, connection_id);
    `)
    this.q = {
      insert: db.prepare(
        `INSERT OR IGNORE INTO bank_transactions (user_id, connection_id, ext_key, payload, created_at, tx_date)
         VALUES (?,?,?,?,?,?)`,
      ),
      // Same-day rows keep newest-stored first
      list: db.prepare(
        `SELECT payload FROM bank_transactions
         WHERE user_id = ? AND tx_date >= ? AND tx_date <= ?
         ORDER BY tx_date DESC, id DESC`,
      ),
      listRows: db.prepare(
        `SELECT ext_key, payload FROM bank_transactions
         WHERE user_id = ? AND tx_date >= ? AND tx_date <= ?
         ORDER BY tx_date DESC, id DESC`,
      ),
      byRef: db.prepare('SELECT ext_key, payload FROM bank_transactions WHERE user_id = ? AND ext_key = ?'),
      count: db.prepare('SELECT COUNT(*) AS n FROM bank_transactions WHERE user_id = ?'),
      signature: db.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(id), 0) AS m FROM bank_transactions WHERE user_id = ?'),
      oldest: db.prepare('SELECT MIN(tx_date) AS d FROM bank_transactions WHERE user_id = ? AND connection_id = ?'),
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
          tx.date,
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
            tx.date,
          )
        }
        db.exec('DROP TABLE bank_transactions_v1')
      })()
    }
    this.backfillDates(db)
  }

  /** One-time: rows from before tx_date existed take their date from the encrypted payload. */
  private backfillDates(db: DatabaseService['db']) {
    const missing = db.prepare('SELECT id, payload FROM bank_transactions WHERE tx_date IS NULL').all() as Array<{
      id: number
      payload: string
    }>

    if (missing.length === 0) {
      return
    }
    const set = db.prepare('UPDATE bank_transactions SET tx_date = ? WHERE id = ?')

    db.transaction(() => {
      for (const r of missing) {
        set.run((JSON.parse(decrypt(r.payload, this.key)) as BankTransaction).date, r.id)
      }
    })()
  }

  private readonly insertMany: (userId: string, connectionId: string, txs: BankTransaction[]) => number

  /** Stores what is new and ignores what is already there. Returns how many were new. */
  save(userId: string, connectionId: string, txs: BankTransaction[]): number {
    return this.insertMany(userId, connectionId, txs)
  }

  /** Newest first. The database applies the date range, so only matching rows are decrypted. */
  list(userId: string, from = '0000-01-01', to = '9999-12-31'): BankTransaction[] {
    const rows = this.q.list.all(userId, from, to) as Array<{ payload: string }>

    return rows.map(r => JSON.parse(decrypt(r.payload, this.key)) as BankTransaction)
  }

  /** Like list, with each row's opaque ref: how trips point at a transaction without copying it. */
  listWithRefs(userId: string, from = '0000-01-01', to = '9999-12-31'): Array<{ ref: string; tx: BankTransaction }> {
    const rows = this.q.listRows.all(userId, from, to) as Array<{ ext_key: string; payload: string }>

    return rows.map(r => ({ ref: r.ext_key, tx: JSON.parse(decrypt(r.payload, this.key)) as BankTransaction }))
  }

  /** The given transactions of this person; refs that are unknown (or someone else's) are left out. */
  findByRefs(userId: string, refs: string[]): Map<string, BankTransaction> {
    const found = new Map<string, BankTransaction>()

    for (const ref of refs) {
      const row = this.q.byRef.get(userId, ref) as { ext_key: string; payload: string } | undefined

      if (row) {
        found.set(row.ext_key, JSON.parse(decrypt(row.payload, this.key)) as BankTransaction)
      }
    }

    return found
  }

  count(userId: string): number {
    return (this.q.count.get(userId) as { n: number }).n
  }

  /** Changes whenever this person's stored transactions do: lets derived results be reused until then. */
  signature(userId: string): string {
    const r = this.q.signature.get(userId) as { n: number; m: number }

    return `${r.n}:${r.m}`
  }

  /** The booking date of the oldest stored transaction for this connection: where a backfill starts. */
  oldestDate(userId: string, connectionId: string): string | null {
    return (this.q.oldest.get(userId, connectionId) as { d: string | null }).d
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
