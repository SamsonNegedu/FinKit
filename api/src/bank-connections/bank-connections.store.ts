import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { DatabaseService } from '../shared/database/database.service'

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'replaced'

export interface ConnectionRow {
  id: string
  provider: string
  aspsp_name: string
  aspsp_country: string
  status: ConnectionStatus
  secret_blob: string // encrypted {sessionId, accounts}
  account_labels: string // JSON: [{label, currency}] (masked, safe to show)
  valid_until: string
  created_at: string
  last_sync_at: string | null
  last_sync_started_at: string | null
  last_sync_to: string | null
}

interface AuthState {
  state: string
  aspsp_name: string
  aspsp_country: string
  expires_at: string
  used: number
  replace_connection_id: string | null
}

const iso = () => new Date().toISOString()
const daysAgo = (days: number) => new Date(Date.now() - days * 86400_000).toISOString()

/** All persistence for bank connections. Connection metadata only: transactions are never stored. */
@Injectable()
export class BankConnectionsStore {
  private readonly q

  constructor(database: DatabaseService) {
    const { db } = database
    db.exec(`
      CREATE TABLE IF NOT EXISTS bank_connections (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        aspsp_name TEXT NOT NULL,
        aspsp_country TEXT NOT NULL,
        status TEXT NOT NULL,
        secret_blob TEXT NOT NULL,
        account_labels TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_sync_at TEXT,
        last_sync_started_at TEXT,
        last_sync_to TEXT
      );
      CREATE TABLE IF NOT EXISTS bank_auth_states (
        state TEXT PRIMARY KEY,
        aspsp_name TEXT NOT NULL,
        aspsp_country TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        replace_connection_id TEXT
      );
      CREATE TABLE IF NOT EXISTS bank_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        date_from TEXT,
        date_to TEXT,
        status TEXT NOT NULL,
        fetched INTEGER NOT NULL DEFAULT 0,
        error TEXT
      );
      CREATE TABLE IF NOT EXISTS bank_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        detail TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bank_sync_log_started ON bank_sync_log(started_at);
      CREATE INDEX IF NOT EXISTS idx_bank_audit_ts ON bank_audit_log(ts);
    `)
    this.q = {
      insertState: db.prepare(
        'INSERT INTO bank_auth_states (state, aspsp_name, aspsp_country, expires_at, replace_connection_id) VALUES (?,?,?,?,?)',
      ),
      getState: db.prepare('SELECT * FROM bank_auth_states WHERE state = ?'),
      // Single-use: only one caller can flip used from 0 to 1
      useState: db.prepare('UPDATE bank_auth_states SET used = 1 WHERE state = ? AND used = 0'),
      purgeStates: db.prepare('DELETE FROM bank_auth_states WHERE expires_at < ?'),
      insertConn: db.prepare(`INSERT INTO bank_connections
        (id, provider, aspsp_name, aspsp_country, status, secret_blob, account_labels, valid_until, created_at, last_sync_to)
        VALUES (@id, @provider, @aspsp_name, @aspsp_country, 'active', @secret_blob, @account_labels, @valid_until, @created_at, @last_sync_to)`),
      getConn: db.prepare('SELECT * FROM bank_connections WHERE id = ?'),
      listConns: db.prepare(
        "SELECT * FROM bank_connections WHERE status NOT IN ('revoked','replaced') ORDER BY created_at DESC",
      ),
      setStatus: db.prepare('UPDATE bank_connections SET status = ? WHERE id = ?'),
      wipeSecret: db.prepare("UPDATE bank_connections SET status = ?, secret_blob = '' WHERE id = ?"),
      syncStarted: db.prepare('UPDATE bank_connections SET last_sync_started_at = ? WHERE id = ?'),
      syncDone: db.prepare('UPDATE bank_connections SET last_sync_at = ?, last_sync_to = ? WHERE id = ?'),
      setValidUntil: db.prepare('UPDATE bank_connections SET valid_until = ? WHERE id = ?'),
      insertSync: db.prepare(
        'INSERT INTO bank_sync_log (connection_id, started_at, date_from, date_to, status) VALUES (?,?,?,?,?)',
      ),
      finishSync: db.prepare(
        'UPDATE bank_sync_log SET finished_at = ?, status = ?, fetched = ?, error = ? WHERE id = ?',
      ),
      syncLog:
        db.prepare(`SELECT l.id, l.connection_id, c.aspsp_name AS bank, l.started_at, l.finished_at, l.date_from, l.date_to, l.status, l.fetched, l.error
        FROM bank_sync_log l LEFT JOIN bank_connections c ON c.id = l.connection_id ORDER BY l.id DESC LIMIT ?`),
      syncStats: db.prepare('SELECT status, COUNT(*) AS n FROM bank_sync_log WHERE started_at >= ? GROUP BY status'),
      lastOk:
        db.prepare(`SELECT l.finished_at, c.aspsp_name AS bank FROM bank_sync_log l LEFT JOIN bank_connections c ON c.id = l.connection_id
        WHERE l.status = 'ok' ORDER BY l.id DESC LIMIT 1`),
      insertAudit: db.prepare('INSERT INTO bank_audit_log (ts, actor, action, target, detail) VALUES (?,?,?,?,?)'),
      audit: db.prepare('SELECT ts, actor, action, target, detail FROM bank_audit_log ORDER BY id DESC LIMIT ?'),
      pruneSync: db.prepare('DELETE FROM bank_sync_log WHERE started_at < ?'),
      pruneAudit: db.prepare('DELETE FROM bank_audit_log WHERE ts < ?'),
    }
  }

  // ---- sign-in requests started by the user (single use, ten minutes) ----
  createState(p: { state: string; bankName: string; country: string; replaceConnectionId?: string; ttlMs?: number }) {
    this.q.purgeStates.run(iso())
    this.q.insertState.run(
      p.state,
      p.bankName,
      p.country,
      new Date(Date.now() + (p.ttlMs ?? 600_000)).toISOString(),
      p.replaceConnectionId ?? null,
    )
  }
  getState(state: string) {
    return this.q.getState.get(state) as AuthState | undefined
  }
  /** Returns the request only for the first caller within its validity window. */
  consumeState(state: string): AuthState | null {
    const row = this.getState(state)
    if (!row || row.used || row.expires_at < iso()) return null
    return this.q.useState.run(state).changes === 1 ? row : null
  }

  // ---- connections ----
  createConnection(p: {
    provider: string
    bankName: string
    country: string
    secretBlob: string
    accountLabels: unknown
    validUntil: string
    lastSyncTo?: string | null
  }) {
    const id = randomUUID()
    this.q.insertConn.run({
      id,
      provider: p.provider,
      aspsp_name: p.bankName,
      aspsp_country: p.country,
      secret_blob: p.secretBlob,
      account_labels: JSON.stringify(p.accountLabels),
      valid_until: p.validUntil,
      created_at: iso(),
      last_sync_to: p.lastSyncTo ?? null,
    })
    return id
  }
  getConnection(id: string) {
    return this.q.getConn.get(id) as ConnectionRow | undefined
  }
  listConnections() {
    return this.q.listConns.all() as ConnectionRow[]
  }
  setStatus(id: string, status: ConnectionStatus) {
    this.q.setStatus.run(status, id)
  }
  retire(id: string, status: 'revoked' | 'replaced') {
    this.q.wipeSecret.run(status, id)
  } // also erases the stored link
  markSyncStarted(id: string, at: string = iso()) {
    this.q.syncStarted.run(at, id)
  }
  markSyncDone(id: string, to: string, at: string = iso()) {
    this.q.syncDone.run(at, to, id)
  }
  setValidUntil(id: string, validUntil: string) {
    this.q.setValidUntil.run(validUntil, id)
  }

  // ---- sync log and audit trail ----
  startSyncLog(connectionId: string, from: string, to: string) {
    return Number(this.q.insertSync.run(connectionId, iso(), from, to, 'running').lastInsertRowid)
  }
  finishSyncLog(id: number, status: 'ok' | 'failed' | 'rate_limited', fetched: number, error?: string) {
    this.q.finishSync.run(iso(), status, fetched, error ? error.slice(0, 200) : null, id)
  }
  syncLog(limit = 100) {
    return this.q.syncLog.all(limit) as Array<Record<string, unknown>>
  }
  syncStats(days = 30) {
    const rows = this.q.syncStats.all(daysAgo(days)) as Array<{ status: string; n: number }>
    const by = Object.fromEntries(rows.map(r => [r.status, r.n]))
    return {
      ok: by.ok ?? 0,
      failed: (by.failed ?? 0) + (by.rate_limited ?? 0),
      total: rows.reduce((sum, r) => sum + r.n, 0),
    }
  }
  lastSuccessfulSync() {
    return this.q.lastOk.get() as { finished_at: string; bank: string } | undefined
  }
  audit(actor: string, action: string, target?: string, detail?: unknown) {
    this.q.insertAudit.run(
      iso(),
      actor,
      action,
      target ?? null,
      detail === undefined ? null : JSON.stringify(detail).slice(0, 500),
    )
  }
  auditLog(limit = 100) {
    return this.q.audit.all(limit) as Array<Record<string, unknown>>
  }
  prune() {
    this.q.pruneSync.run(daysAgo(90))
    this.q.pruneAudit.run(daysAgo(365))
    this.q.purgeStates.run(iso())
  }
}
