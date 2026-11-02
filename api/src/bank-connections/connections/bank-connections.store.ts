import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { isoDaysAgo } from '../../shared/constants/time'
import {
  AUDIT_LOG_RETENTION_DAYS,
  OAUTH_STATE_TTL_MS,
  REQUEST_BUDGET_RETENTION_DAYS,
  SYNC_LOG_RETENTION_DAYS,
} from '../constants'
import { DatabaseService } from '../../shared/database/database.service'
import { ensureColumn } from '../../shared/database/migrate'
import { UsersService } from '../../users/users.service'

export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'replaced'

export interface ConnectionRow {
  id: string
  user_id: string | null
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
  /** Oldest date fetched so far while walking back through history; null until backfill starts */
  backfill_cursor: string | null
  backfill_status: BackfillStatus | null
  backfill_reason: string | null
  backfill_empty: number | null
  backfill_window_days: number | null
  /** The UTC day a backfill window was last attempted: at most one a day */
  backfill_day: string | null
  /** No background request may be made before this (a bank said "too many" and told us when to return) */
  blocked_until: string | null
}

export type BackfillStatus = 'pending' | 'done' | 'blocked'

interface AuthState {
  state: string
  user_id: string | null
  aspsp_name: string
  aspsp_country: string
  expires_at: string
  used: number
  replace_connection_id: string | null
}

const iso = () => new Date().toISOString()

/** All persistence for bank connections: metadata only. Synced transactions live in BankTransactionsStore. */
@Injectable()
export class BankConnectionsStore {
  private readonly q

  constructor(database: DatabaseService, users: UsersService) {
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
      CREATE TABLE IF NOT EXISTS bank_request_budget (
        connection_id TEXT NOT NULL,
        account_ref TEXT NOT NULL,
        day TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (connection_id, account_ref, day)
      );
      CREATE INDEX IF NOT EXISTS idx_bank_sync_log_started ON bank_sync_log(started_at);
      CREATE INDEX IF NOT EXISTS idx_bank_audit_ts ON bank_audit_log(ts);
    `)
    // Older databases predate user accounts: add the owner column, and let the first user adopt old rows
    ensureColumn(db, 'bank_connections', 'user_id', 'TEXT')
    ensureColumn(db, 'bank_auth_states', 'user_id', 'TEXT')
    ensureColumn(db, 'bank_audit_log', 'user_id', 'TEXT')
    ensureColumn(db, 'bank_connections', 'backfill_cursor', 'TEXT')
    ensureColumn(db, 'bank_connections', 'backfill_status', 'TEXT')
    ensureColumn(db, 'bank_connections', 'backfill_reason', 'TEXT')
    ensureColumn(db, 'bank_connections', 'backfill_empty', 'INTEGER NOT NULL DEFAULT 0')
    ensureColumn(db, 'bank_connections', 'backfill_window_days', 'INTEGER')
    ensureColumn(db, 'bank_connections', 'backfill_day', 'TEXT')
    ensureColumn(db, 'bank_connections', 'blocked_until', 'TEXT')
    db.exec('CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id)')
    users.onLegacyOwnerCreated(userId => {
      db.prepare('UPDATE bank_connections SET user_id = ? WHERE user_id IS NULL').run(userId)
      db.prepare('UPDATE bank_auth_states SET user_id = ? WHERE user_id IS NULL').run(userId)
      db.prepare('UPDATE bank_audit_log SET user_id = ? WHERE user_id IS NULL').run(userId)
    })
    this.q = {
      insertState: db.prepare(
        'INSERT INTO bank_auth_states (state, user_id, aspsp_name, aspsp_country, expires_at, replace_connection_id) VALUES (?,?,?,?,?,?)',
      ),
      getState: db.prepare('SELECT * FROM bank_auth_states WHERE state = ?'),
      // Single-use: only one caller can flip used from 0 to 1
      useState: db.prepare('UPDATE bank_auth_states SET used = 1 WHERE state = ? AND used = 0'),
      purgeStates: db.prepare('DELETE FROM bank_auth_states WHERE expires_at < ?'),
      insertConn: db.prepare(`INSERT INTO bank_connections
        (id, user_id, provider, aspsp_name, aspsp_country, status, secret_blob, account_labels, valid_until, created_at, last_sync_to)
        VALUES (@id, @user_id, @provider, @aspsp_name, @aspsp_country, 'active', @secret_blob, @account_labels, @valid_until, @created_at, @last_sync_to)`),
      getConn: db.prepare('SELECT * FROM bank_connections WHERE id = ?'),
      listConns: db.prepare(
        "SELECT * FROM bank_connections WHERE user_id = ? AND status NOT IN ('revoked','replaced') ORDER BY created_at DESC",
      ),
      due: db.prepare(
        `SELECT * FROM bank_connections WHERE status = 'active' AND user_id IS NOT NULL AND secret_blob != ''
         AND valid_until > ? AND (last_sync_started_at IS NULL OR last_sync_started_at < ?)
         AND (blocked_until IS NULL OR blocked_until <= ?)`,
      ),
      backfillCandidates: db.prepare(
        `SELECT * FROM bank_connections WHERE status = 'active' AND user_id IS NOT NULL AND secret_blob != ''
         AND valid_until > ? AND last_sync_to IS NOT NULL AND (backfill_status IS NULL OR backfill_status = 'pending')`,
      ),
      setStatus: db.prepare('UPDATE bank_connections SET status = ? WHERE id = ?'),
      wipeSecret: db.prepare("UPDATE bank_connections SET status = ?, secret_blob = '' WHERE id = ?"),
      syncStarted: db.prepare('UPDATE bank_connections SET last_sync_started_at = ? WHERE id = ?'),
      syncDone: db.prepare('UPDATE bank_connections SET last_sync_at = ?, last_sync_to = ? WHERE id = ?'),
      setValidUntil: db.prepare('UPDATE bank_connections SET valid_until = ? WHERE id = ?'),
      setBackfill: db.prepare(
        `UPDATE bank_connections SET backfill_cursor = ?, backfill_status = ?, backfill_reason = ?,
         backfill_empty = ?, backfill_window_days = ?, backfill_day = COALESCE(?, backfill_day) WHERE id = ? AND user_id = ?`,
      ),
      carryBackfill: db.prepare(
        `UPDATE bank_connections SET backfill_cursor = ?, backfill_status = ?, backfill_reason = ?,
         backfill_empty = ?, backfill_window_days = ?, backfill_day = ?, blocked_until = ? WHERE id = ?`,
      ),
      setBlocked: db.prepare('UPDATE bank_connections SET blocked_until = ? WHERE id = ?'),
      budgetGet: db.prepare(
        'SELECT used FROM bank_request_budget WHERE connection_id = ? AND account_ref = ? AND day = ?',
      ),
      budgetAdd: db.prepare(
        `INSERT INTO bank_request_budget (connection_id, account_ref, day, used) VALUES (?,?,?,1)
         ON CONFLICT(connection_id, account_ref, day) DO UPDATE SET used = used + 1`,
      ),
      pruneBudget: db.prepare('DELETE FROM bank_request_budget WHERE day < ?'),
      insertSync: db.prepare(
        'INSERT INTO bank_sync_log (connection_id, started_at, date_from, date_to, status) VALUES (?,?,?,?,?)',
      ),
      finishSync: db.prepare(
        'UPDATE bank_sync_log SET finished_at = ?, status = ?, fetched = ?, error = ? WHERE id = ?',
      ),
      syncLog:
        db.prepare(`SELECT l.id, l.connection_id, c.aspsp_name AS bank, l.started_at, l.finished_at, l.date_from, l.date_to, l.status, l.fetched, l.error
        FROM bank_sync_log l JOIN bank_connections c ON c.id = l.connection_id WHERE c.user_id = ? ORDER BY l.id DESC LIMIT ?`),
      syncStats:
        db.prepare(`SELECT l.status, COUNT(*) AS n FROM bank_sync_log l JOIN bank_connections c ON c.id = l.connection_id
        WHERE c.user_id = ? AND l.started_at >= ? GROUP BY l.status`),
      lastOk:
        db.prepare(`SELECT l.finished_at, c.aspsp_name AS bank FROM bank_sync_log l JOIN bank_connections c ON c.id = l.connection_id
        WHERE c.user_id = ? AND l.status = 'ok' ORDER BY l.id DESC LIMIT 1`),
      insertAudit: db.prepare(
        'INSERT INTO bank_audit_log (ts, actor, action, target, detail, user_id) VALUES (?,?,?,?,?,?)',
      ),
      audit: db.prepare(
        'SELECT ts, actor, action, target, detail FROM bank_audit_log WHERE user_id = ? ORDER BY id DESC LIMIT ?',
      ),
      pruneSync: db.prepare('DELETE FROM bank_sync_log WHERE started_at < ?'),
      pruneAudit: db.prepare('DELETE FROM bank_audit_log WHERE ts < ?'),
    }
  }

  // ---- sign-in requests started by the user (single use, ten minutes) ----
  createState(p: {
    state: string
    userId: string
    bankName: string
    country: string
    replaceConnectionId?: string
    ttlMs?: number
  }) {
    this.q.purgeStates.run(iso())
    this.q.insertState.run(
      p.state,
      p.userId,
      p.bankName,
      p.country,
      new Date(Date.now() + (p.ttlMs ?? OAUTH_STATE_TTL_MS)).toISOString(),
      p.replaceConnectionId ?? null,
    )
  }

  getState(state: string) {
    return this.q.getState.get(state) as AuthState | undefined
  }

  /** Returns the request only for the first caller within its validity window. */
  consumeState(state: string): AuthState | null {
    const row = this.getState(state)

    if (!row || row.used || row.expires_at < iso()) {
      return null
    }

    return this.q.useState.run(state).changes === 1 ? row : null
  }

  // ---- connections ----
  createConnection(p: {
    userId: string
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
      user_id: p.userId,
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

  /** Any connection by id. Callers that act for a user must also check `ownedBy`. */
  getConnection(id: string) {
    return this.q.getConn.get(id) as ConnectionRow | undefined
  }

  /** The connection, only when it belongs to this user. */
  getOwnedConnection(id: string, userId: string) {
    const row = this.getConnection(id)

    return row && row.user_id === userId ? row : undefined
  }

  listConnections(userId: string) {
    return this.q.listConns.all(userId) as ConnectionRow[]
  }

  /**
   * Accounts that a newer link to the same bank also covers. When a bank is connected again with only some accounts
   * approved, the older link is kept for the rest, and must not read these a second time.
   */
  newerAccountRefs(userId: string, row: ConnectionRow): Set<string> {
    const refs = new Set<string>()

    for (const c of this.listConnections(userId)) {
      if (
        c.id !== row.id &&
        c.status === 'active' &&
        c.aspsp_name === row.aspsp_name &&
        c.created_at > row.created_at
      ) {
        for (const a of JSON.parse(c.account_labels) as Array<{ id: string }>) {
          refs.add(a.id)
        }
      }
    }

    return refs
  }

  /** Active connections that still have older history to ask for. */
  backfillCandidates(now: string) {
    return this.q.backfillCandidates.all(now) as ConnectionRow[]
  }

  /** Active connections not synced since `before`, for the scheduled catch-up. */
  dueForSync(now: string, before: string) {
    return this.q.due.all(now, before, now) as ConnectionRow[]
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

  // ---- backfill: walking back through older history, a window at a time ----
  setBackfill(
    id: string,
    userId: string,
    p: {
      cursor: string | null
      status: BackfillStatus
      reason?: string | null
      empty: number
      windowDays: number | null
      /** Set when a window was attempted today; leave out to keep the last one */
      day?: string
    },
  ) {
    this.q.setBackfill.run(p.cursor, p.status, p.reason ?? null, p.empty, p.windowDays, p.day ?? null, id, userId)
  }

  /** A reconnect keeps the old connection's place, so older history is not asked for twice. */
  carryBackfill(from: ConnectionRow, toId: string) {
    this.q.carryBackfill.run(
      from.backfill_cursor,
      from.backfill_status,
      from.backfill_reason,
      from.backfill_empty ?? 0,
      from.backfill_window_days,
      from.backfill_day,
      from.blocked_until,
      toId,
    )
  }

  setBlockedUntil(id: string, until: string | null) {
    this.q.setBlocked.run(until, id)
  }

  // ---- how many background requests an account has used today ----
  requestsUsed(connectionId: string, accountRef: string, day: string) {
    const row = this.q.budgetGet.get(connectionId, accountRef, day) as { used: number } | undefined

    return row?.used ?? 0
  }

  countRequest(connectionId: string, accountRef: string, day: string) {
    this.q.budgetAdd.run(connectionId, accountRef, day)
  }

  // ---- sync log and audit trail ----
  startSyncLog(connectionId: string, from: string, to: string) {
    return Number(this.q.insertSync.run(connectionId, iso(), from, to, 'running').lastInsertRowid)
  }

  finishSyncLog(id: number, status: 'ok' | 'failed' | 'rate_limited', fetched: number, error?: string) {
    this.q.finishSync.run(iso(), status, fetched, error ? error.slice(0, 200) : null, id)
  }

  syncLog(userId: string, limit = 100) {
    return this.q.syncLog.all(userId, limit) as Array<Record<string, unknown>>
  }

  syncStats(userId: string, days = 30) {
    const rows = this.q.syncStats.all(userId, isoDaysAgo(days)) as Array<{
      status: string
      n: number
    }>
    const by = Object.fromEntries(rows.map(r => [r.status, r.n]))

    return {
      ok: by.ok ?? 0,
      failed: (by.failed ?? 0) + (by.rate_limited ?? 0),
      total: rows.reduce((sum, r) => sum + r.n, 0),
    }
  }

  lastSuccessfulSync(userId: string) {
    return this.q.lastOk.get(userId) as { finished_at: string; bank: string } | undefined
  }

  /** `userId` is whose trail this belongs to. Entries with none (refused strangers) are nobody's. */
  audit(actor: string, action: string, target?: string, detail?: unknown, userId?: string | null) {
    this.q.insertAudit.run(
      iso(),
      actor,
      action,
      target ?? null,
      detail === undefined ? null : JSON.stringify(detail).slice(0, 500),
      userId ?? null,
    )
  }

  /** What happened to this person's connections. */
  auditLog(userId: string, limit = 100) {
    return this.q.audit.all(userId, limit) as Array<Record<string, unknown>>
  }

  prune() {
    this.q.pruneSync.run(isoDaysAgo(SYNC_LOG_RETENTION_DAYS))
    this.q.pruneAudit.run(isoDaysAgo(AUDIT_LOG_RETENTION_DAYS))
    this.q.pruneBudget.run(isoDaysAgo(REQUEST_BUDGET_RETENTION_DAYS).slice(0, 10))
    this.q.purgeStates.run(iso())
  }
}
