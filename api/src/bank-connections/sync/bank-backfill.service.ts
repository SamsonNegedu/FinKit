import { Inject, Injectable, Logger } from '@nestjs/common'
import { accountRef } from '../../shared/crypto/encryption'
import { addDays, addMilliseconds } from '../../shared/constants/time'
import { BANKING_CONFIG, BankingConfig, CLOCK, Clock } from '../config/bank-connections.tokens'
import { BankConnectionsStore, ConnectionRow } from '../connections/bank-connections.store'
import {
  BACKFILL_EMPTY_LIMIT,
  BACKFILL_FLOOR,
  BACKFILL_WINDOW_DAYS,
  DEFAULT_SYNC_HISTORY_DAYS,
  RATE_LIMIT_BACKOFF_SECONDS,
} from '../constants'
import {
  BANK_PROVIDER,
  BankProvider,
  BankTransaction,
  ProviderAccount,
  ProviderError,
  errorSummary,
} from '../providers/bank-provider'
import { BankTransactionsStore } from '../../transactions/bank-transactions.store'
import { BudgetExhausted, backfillAllowance, shrink } from './backfill-budget'
import { openSession } from './session'

const day = (d: Date) => d.toISOString().slice(0, 10)
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Walks back through a connection's older history, one window a day, using only the bank requests
 * the scheduled syncs leave over. It stops when the bank has nothing older, refuses older dates, or
 * needs the person to sign in again; it never retries a refusal.
 */
@Injectable()
export class BankBackfillService {
  private readonly logger = new Logger(BankBackfillService.name)

  constructor(
    private readonly store: BankConnectionsStore,
    private readonly txs: BankTransactionsStore,
    @Inject(BANK_PROVIDER) private readonly provider: BankProvider,
    @Inject(BANKING_CONFIG) private readonly config: BankingConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Called by the scheduler after the normal catch-up. Connections go one at a time. */
  async backfillDue(): Promise<number> {
    const now = this.clock.now()
    let done = 0

    for (const row of this.store.backfillCandidates(now.toISOString())) {
      if (await this.step(row)) {
        done++
      }
    }

    return done
  }

  /** The person asked to look again, e.g. after reconnecting, or after a block cleared. */
  restart(connectionId: string, userId: string): boolean {
    const row = this.store.getOwnedConnection(connectionId, userId)

    if (!row || row.status !== 'active') {
      return false
    }
    this.store.setBackfill(row.id, userId, {
      cursor: row.backfill_cursor,
      status: 'pending',
      empty: 0,
      windowDays: BACKFILL_WINDOW_DAYS,
    })
    this.store.setBlockedUntil(row.id, null)

    return true
  }

  /** One window for one connection. Resolves true when a window was fetched and stored. */
  private async step(row: ConnectionRow): Promise<boolean> {
    const now = this.clock.now()
    const today = day(now)
    const userId = row.user_id!

    // One try a day, and not while a bank has asked us to hold off
    if (row.backfill_day === today || (row.blocked_until && row.blocked_until > now.toISOString())) {
      return false
    }

    const cursor =
      row.backfill_cursor ?? this.txs.oldestDate(userId, row.id) ?? day(addDays(now, -DEFAULT_SYNC_HISTORY_DAYS))
    const windowDays = row.backfill_window_days ?? BACKFILL_WINDOW_DAYS

    if (cursor <= BACKFILL_FLOOR) {
      this.store.setBackfill(row.id, userId, { cursor, status: 'done', reason: 'floor', empty: 0, windowDays })

      return false
    }

    const opened = openSession(row, this.config.encryptionKey)
    const covered = this.store.newerAccountRefs(userId, row)
    const accounts = opened.accounts.filter(a => !covered.has(accountRef(a.stableId)))
    const session = { ...opened, accounts }

    if (accounts.length === 0) {
      return false
    }

    // Every account must have room today, or the window waits for tomorrow
    const room = (a: ProviderAccount) =>
      backfillAllowance({
        cap: this.config.backgroundRequestCap,
        used: this.store.requestsUsed(row.id, accountRef(a.stableId), today),
        now,
        autoSyncHours: this.config.autoSyncHours,
      })

    if (accounts.some(a => room(a) < 1)) {
      return false
    }

    const to = cursor
    const earliest = day(addDays(new Date(cursor), -windowDays))
    const from = earliest < BACKFILL_FLOOR ? BACKFILL_FLOOR : earliest
    const logId = this.store.startSyncLog(row.id, from, to)
    const all: BankTransaction[] = []

    try {
      for (const account of accounts) {
        const ref = accountRef(account.stableId)
        let calls = 0
        const allowed = room(account)

        const fetched = await this.provider.fetchTransactions({
          session,
          account,
          from,
          to,
          beforeRequest: async () => {
            if (calls >= allowed) {
              throw new BudgetExhausted()
            }
            if (calls > 0) {
              // Spread the pages out; jitter keeps the pattern from looking mechanical
              await sleep(this.config.backfillPauseMs > 0 ? this.config.backfillPauseMs + Math.random() * 1_000 : 0)
            }
            calls++
            this.store.countRequest(row.id, ref, today)
          },
        })

        for (const tx of fetched) {
          tx.bankName = row.aspsp_name
          tx.accountLabel = account.label
          tx.accountRef = ref
        }
        all.push(...fetched)
      }
    } catch (e) {
      this.onFailure(row, e, { today, cursor, windowDays, logId })

      return false
    }

    const added = this.txs.save(userId, row.id, all)
    const empty = all.length === 0 ? (row.backfill_empty ?? 0) + 1 : 0
    const reachedEnd = empty >= BACKFILL_EMPTY_LIMIT || from <= BACKFILL_FLOOR

    this.store.setBackfill(row.id, userId, {
      cursor: from,
      status: reachedEnd ? 'done' : 'pending',
      reason: reachedEnd ? (empty >= BACKFILL_EMPTY_LIMIT ? 'history_ended' : 'floor') : null,
      empty,
      windowDays,
      day: today,
    })
    this.store.finishSyncLog(logId, 'ok', all.length)
    this.store.audit('scheduler', 'backfill', row.aspsp_name, { from, to, fetched: all.length, added }, userId)

    return true
  }

  private onFailure(
    row: ConnectionRow,
    e: unknown,
    at: { today: string; cursor: string; windowDays: number; logId: number },
  ) {
    const userId = row.user_id!
    const keep = { cursor: at.cursor, empty: row.backfill_empty ?? 0, day: at.today }
    const kind = e instanceof ProviderError ? e.kind : e instanceof BudgetExhausted ? 'budget' : 'unavailable'

    this.logger.warn(`Backfill stopped (${kind}): ${errorSummary(e)}`)
    this.store.finishSyncLog(
      at.logId,
      kind === 'rate_limited' || kind === 'budget' ? 'rate_limited' : 'failed',
      0,
      kind,
    )

    if (e instanceof BudgetExhausted || (e instanceof ProviderError && e.kind === 'too_large')) {
      // Did not fit today's requests: try a smaller window tomorrow
      this.store.setBackfill(row.id, userId, { ...keep, status: 'pending', windowDays: shrink(at.windowDays) })
    } else if (e instanceof ProviderError && e.kind === 'rate_limited') {
      // The bank itself said slow down: nothing in the background until it says we may return
      const wait = addMilliseconds(this.clock.now(), (e.retryAfterSeconds ?? RATE_LIMIT_BACKOFF_SECONDS) * 1_000)

      this.store.setBlockedUntil(row.id, wait.toISOString())
      this.store.setBackfill(row.id, userId, { ...keep, status: 'pending', windowDays: at.windowDays })
    } else if (e instanceof ProviderError && e.kind === 'rejected') {
      // The bank will not give dates this old: that is where its history ends
      this.store.setBackfill(row.id, userId, {
        ...keep,
        status: 'done',
        reason: 'bank_limit',
        windowDays: at.windowDays,
      })
    } else if (e instanceof ProviderError && e.kind === 'consent_expired') {
      // May be a stale consent or a request for older data needing sign-in; the normal sync decides expiry
      this.store.setBackfill(row.id, userId, {
        ...keep,
        status: 'blocked',
        reason: 'needs_relink',
        windowDays: at.windowDays,
      })
    } else {
      this.store.setBackfill(row.id, userId, { ...keep, status: 'pending', windowDays: at.windowDays })
    }
  }
}
