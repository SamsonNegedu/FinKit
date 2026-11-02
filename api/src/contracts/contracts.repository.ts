import { Inject, Injectable } from '@nestjs/common'
import { createHmac, randomUUID } from 'node:crypto'
import { BANKING_CONFIG, BankingConfig } from '../bank-connections/config/bank-connections.tokens'
import { decrypt, encrypt } from '../shared/crypto/encryption'
import { DatabaseService } from '../shared/database/database.service'
import { ensureColumn } from '../shared/database/migrate'
import type { Detected, State, UserData } from './contracts.types'

export interface ContractRow {
  id: string
  currency: string
  state: State
  detected: Detected | null
  user: UserData
  /** When this contract was first found or added */
  createdAt: string | null
}

interface Raw {
  id: string
  merchant_key: string
  currency: string
  state: State
  detected: string | null
  user_data: string
  created_at: string | null
}

/**
 * Contracts per person. What the bank told us (names, amounts, dates) and what the person added
 * (notes, mileage) are each encrypted in one value; what stays readable is the owner, a keyed
 * fingerprint of the payee (used to recognise a contract again, it reveals nothing), the currency and the state. Every query filters by user_id.
 */
@Injectable()
export class ContractsRepository {
  private readonly q
  private readonly key: Buffer
  private readonly lookupKey: Buffer

  constructor(database: DatabaseService, @Inject(BANKING_CONFIG) config: BankingConfig) {
    const { db } = database

    this.key = config.encryptionKey
    // A separate key for the payee fingerprint, so the readable column never reveals who was paid
    this.lookupKey = createHmac('sha256', this.key).update('finkit:contract-key').digest()
    db.exec(`
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        merchant_key TEXT NOT NULL,
        currency TEXT NOT NULL,
        state TEXT NOT NULL,
        detected TEXT,
        user_data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_unique ON contracts(user_id, merchant_key, currency);
    `)
    ensureColumn(db, 'contracts', 'created_at', 'TEXT')
    this.q = {
      list: db.prepare(
        'SELECT id, merchant_key, currency, state, detected, user_data, created_at FROM contracts WHERE user_id = ?',
      ),
      get: db.prepare(
        'SELECT id, merchant_key, currency, state, detected, user_data, created_at FROM contracts WHERE user_id = ? AND id = ?',
      ),
      byKey: db.prepare(
        'SELECT id, merchant_key, currency, state, detected, user_data, created_at FROM contracts WHERE user_id = ? AND merchant_key = ? AND currency = ?',
      ),
      insert: db.prepare(
        `INSERT INTO contracts (id, user_id, merchant_key, currency, state, detected, user_data, updated_at, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      ),
      setDetected: db.prepare('UPDATE contracts SET detected = ?, updated_at = ? WHERE user_id = ? AND id = ?'),
      setUser: db.prepare('UPDATE contracts SET state = ?, user_data = ?, updated_at = ? WHERE user_id = ? AND id = ?'),
      remove: db.prepare("DELETE FROM contracts WHERE user_id = ? AND id = ? AND state = 'manual'"),
      removeDetected: db.prepare("DELETE FROM contracts WHERE user_id = ? AND state != 'manual'"),
    }
  }

  private fingerprint(merchantKey: string) {
    return merchantKey.startsWith('manual:')
      ? merchantKey
      : createHmac('sha256', this.lookupKey).update(merchantKey).digest('hex')
  }

  private seal(v: unknown) {
    return encrypt(JSON.stringify(v), this.key)
  }

  private open(r: Raw): ContractRow {
    return {
      id: r.id,
      currency: r.currency,
      state: r.state,
      detected: r.detected ? (JSON.parse(decrypt(r.detected, this.key)) as Detected) : null,
      user: JSON.parse(decrypt(r.user_data, this.key)) as UserData,
      createdAt: r.created_at,
    }
  }

  list(userId: string): ContractRow[] {
    return (this.q.list.all(userId) as Raw[]).map(r => this.open(r))
  }

  get(userId: string, id: string): ContractRow | undefined {
    const r = this.q.get.get(userId, id) as Raw | undefined

    return r && this.open(r)
  }

  /** Records what detection found. A contract the person already confirmed or dismissed keeps that choice. */
  saveDetected(userId: string, merchantKey: string, currency: string, detected: Detected) {
    const now = new Date().toISOString()
    const existing = this.q.byKey.get(userId, this.fingerprint(merchantKey), currency) as Raw | undefined

    if (existing) {
      this.q.setDetected.run(this.seal(detected), now, userId, existing.id)
    } else {
      this.q.insert.run(
        randomUUID(),
        userId,
        this.fingerprint(merchantKey),
        currency,
        'detected',
        this.seal(detected),
        this.seal({}),
        now,
        now,
      )
    }
  }

  createManual(userId: string, currency: string, user: UserData): string {
    const id = randomUUID()

    this.q.insert.run(
      id,
      userId,
      `manual:${id}`,
      currency,
      'manual',
      null,
      this.seal(user),
      new Date().toISOString(),
      new Date().toISOString(),
    )

    return id
  }

  saveUser(userId: string, id: string, state: State, user: UserData) {
    this.q.setUser.run(state, this.seal(user), new Date().toISOString(), userId, id)
  }

  /** Only hand-made contracts can be deleted; a detected one is dismissed so it does not come back. */
  removeManual(userId: string, id: string): boolean {
    return this.q.remove.run(userId, id).changes === 1
  }

  /** Erasing stored transactions also erases what was found in them; contracts added by hand stay. */
  deleteDetected(userId: string): number {
    return this.q.removeDetected.run(userId).changes
  }
}
