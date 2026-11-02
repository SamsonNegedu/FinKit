import { Inject, Injectable } from '@nestjs/common'
import { DatabaseService } from '../../shared/database/database.service'
import { decrypt, encrypt } from '../../shared/crypto/encryption'
import { BANKING_CONFIG, BankingConfig } from '../config/bank-connections.tokens'
import type { ProviderBalance } from '../providers/bank-provider'

export interface StoredBalance extends ProviderBalance {
  connectionId: string
  accountRef: string
  fetchedAt: string
}

/**
 * The latest balance of each account, per person. The amount is encrypted like a transaction's; what stays
 * readable is who owns it, which account, and when it was fetched. Every query filters by user_id.
 */
@Injectable()
export class BankBalancesStore {
  private readonly q
  private readonly key: Buffer

  constructor(database: DatabaseService, @Inject(BANKING_CONFIG) config: BankingConfig) {
    const { db } = database

    this.key = config.encryptionKey
    db.exec(`
      CREATE TABLE IF NOT EXISTS bank_balances (
        user_id TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        account_ref TEXT NOT NULL,
        payload TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        PRIMARY KEY (user_id, connection_id, account_ref)
      );
    `)
    this.q = {
      upsert: db.prepare(
        `INSERT INTO bank_balances (user_id, connection_id, account_ref, payload, fetched_at) VALUES (?,?,?,?,?)
         ON CONFLICT(user_id, connection_id, account_ref) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
      ),
      list: db.prepare('SELECT connection_id, account_ref, payload, fetched_at FROM bank_balances WHERE user_id = ?'),
      removeConn: db.prepare('DELETE FROM bank_balances WHERE user_id = ? AND connection_id = ?'),
      removeAll: db.prepare('DELETE FROM bank_balances WHERE user_id = ?'),
    }
  }

  save(userId: string, connectionId: string, accountRef: string, balance: ProviderBalance, at = new Date()) {
    this.q.upsert.run(userId, connectionId, accountRef, encrypt(JSON.stringify(balance), this.key), at.toISOString())
  }

  list(userId: string): StoredBalance[] {
    const rows = this.q.list.all(userId) as Array<{
      connection_id: string
      account_ref: string
      payload: string
      fetched_at: string
    }>

    return rows.map(r => ({
      ...(JSON.parse(decrypt(r.payload, this.key)) as ProviderBalance),
      connectionId: r.connection_id,
      accountRef: r.account_ref,
      fetchedAt: r.fetched_at,
    }))
  }

  deleteForConnection(userId: string, connectionId: string) {
    this.q.removeConn.run(userId, connectionId)
  }

  deleteAll(userId: string) {
    return this.q.removeAll.run(userId).changes
  }
}
