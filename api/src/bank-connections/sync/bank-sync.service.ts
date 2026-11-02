import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { Actor } from '../../access/access.settings'
import { accountRef } from '../../shared/crypto/encryption'
import { openSession } from './session'
import { addDays, addMilliseconds, MS_PER_DAY } from '../../shared/constants/time'
import { BANKING_CONFIG, BankingConfig, CLOCK, Clock } from '../config/bank-connections.tokens'
import { connectionStatus } from '../connections/connection-status'
import { SyncInput } from '../connections/bank-connections.schemas'
import { BankConnectionsStore, ConnectionRow } from '../connections/bank-connections.store'
import {
  AUTO_SYNC_LOOKBACK_MS,
  DEFAULT_SYNC_HISTORY_DAYS,
  MAX_SYNC_RANGE_DAYS,
  MIN_SYNC_INTERVAL_MS,
  RATE_LIMIT_BACKOFF_SECONDS,
  SYNC_OVERLAP_DAYS,
} from '../constants'
import {
  BANK_PROVIDER,
  BankProvider,
  BankTransaction,
  ProviderError,
  errorSummary,
  ProviderSession,
  PsuInfo,
} from '../providers/bank-provider'
import { BankBalancesStore } from '../balances/bank-balances.store'
import { BankTransactionsStore } from '../../transactions/bank-transactions.store'

const day = (d: Date) => d.toISOString().slice(0, 10)

/** Fetches transactions from the bank and keeps them: on request, and as a scheduled catch-up. */
@Injectable()
export class BankSyncService {
  private readonly logger = new Logger(BankSyncService.name)

  constructor(
    private readonly store: BankConnectionsStore,
    private readonly txs: BankTransactionsStore,
    private readonly balances: BankBalancesStore,
    @Inject(BANK_PROVIDER) private readonly provider: BankProvider,
    @Inject(BANKING_CONFIG) private readonly config: BankingConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private now() {
    return this.clock.now()
  }

  async sync(actor: Actor, id: string, input: SyncInput, psu?: PsuInfo) {
    const row = this.store.getOwnedConnection(id, actor.userId)

    if (!row || row.status === 'revoked' || row.status === 'replaced') {
      throw new NotFoundException({ error: 'Not found' })
    }
    if (connectionStatus(row, this.now()).status === 'expired') {
      throw new ConflictException({ error: 'expired' })
    }

    const today = day(this.now())
    const to = input.to && input.to < today ? input.to : today
    const from =
      input.from ??
      (row.last_sync_to
        ? day(addDays(new Date(row.last_sync_to), -SYNC_OVERLAP_DAYS))
        : day(addDays(this.now(), -DEFAULT_SYNC_HISTORY_DAYS)))

    if (from > to || (new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY > MAX_SYNC_RANGE_DAYS) {
      throw new BadRequestException({ error: 'Invalid date range' })
    }

    // Banks limit how often access without a user present is allowed; stay well inside that
    if (
      row.last_sync_started_at &&
      this.now().getTime() - new Date(row.last_sync_started_at).getTime() < MIN_SYNC_INTERVAL_MS
    ) {
      throw new HttpException({ error: 'Please wait a minute before syncing again.' }, 429)
    }

    // A connection's very first fetch asks for all the history the bank will give
    return this.runSync(row, from, to, actor.email, { psu, longest: !row.last_sync_to && !input.from })
  }

  /** Fetches, stores and logs one sync. Used by people pressing Sync and by the scheduled catch-up. */
  private async runSync(
    row: ConnectionRow,
    from: string,
    to: string,
    who: string,
    opts: { psu?: PsuInfo; longest?: boolean } = {},
  ) {
    const userId = row.user_id!

    this.store.markSyncStarted(row.id, this.now().toISOString())
    const logId = this.store.startSyncLog(row.id, from, to)

    try {
      const opened = openSession(row, this.config.encryptionKey)
      // An account a newer link to this bank also holds is read through that link only
      const covered = this.store.newerAccountRefs(userId, row)
      const session = { ...opened, accounts: opened.accounts.filter(a => !covered.has(accountRef(a.stableId))) }
      const all: BankTransaction[] = []

      for (const account of session.accounts) {
        const fetched = await this.provider.fetchTransactions({
          session,
          account,
          from,
          to,
          psu: opts.psu,
          longest: opts.longest,
          // Every page counts against the bank's daily cap, so backfill knows what is left
          beforeRequest: async () => this.store.countRequest(row.id, accountRef(account.stableId), day(this.now())),
        })

        // Stamp where each one came from, so the app can browse bank → account → transactions
        for (const tx of fetched) {
          tx.bankName = row.aspsp_name
          tx.accountLabel = account.label
          tx.accountRef = accountRef(account.stableId)
        }
        all.push(...fetched)
      }
      all.sort((a, b) => b.date.localeCompare(a.date))
      const added = this.txs.save(userId, row.id, all)

      this.store.markSyncDone(row.id, to, this.now().toISOString())
      // Balances are only read when a person pressed Sync: those requests carry their details, so the bank does not
      // count them against the few background reads it allows, which the scheduled sync and backfill share
      if (opts.psu) {
        await this.refreshBalances(row, session, userId, opts.psu)
      }
      this.store.finishSyncLog(logId, 'ok', all.length)
      this.store.audit(who, 'sync', row.aspsp_name, { fetched: all.length, added }, userId)

      return { transactions: all, from, to, count: all.length, added }
    } catch (e) {
      const kind = e instanceof ProviderError ? e.kind : 'unavailable'

      this.logger.warn(`Sync failed (${who}): ${errorSummary(e)}`)

      if (kind === 'consent_expired') {
        this.store.setStatus(row.id, 'expired')
      }
      if (kind === 'rate_limited') {
        // The bank asked us to slow down: hold all background requests until it says we may return
        const seconds = e instanceof ProviderError ? e.retryAfterSeconds : undefined

        this.store.setBlockedUntil(
          row.id,
          addMilliseconds(this.now(), (seconds ?? RATE_LIMIT_BACKOFF_SECONDS) * 1_000).toISOString(),
        )
      }
      this.store.finishSyncLog(logId, kind === 'rate_limited' ? 'rate_limited' : 'failed', 0, kind)
      this.store.audit(who, 'sync.failed', row.aspsp_name, { kind }, userId)
      const status = kind === 'consent_expired' ? 409 : kind === 'rate_limited' ? 429 : kind === 'too_large' ? 422 : 502

      throw new HttpException({ error: kind === 'consent_expired' ? 'expired' : kind }, status)
    }
  }

  /** Reads each account's balance. A failure here never fails the sync: the transactions are already kept. */
  private async refreshBalances(row: ConnectionRow, session: ProviderSession, userId: string, psu: PsuInfo) {
    for (const account of session.accounts) {
      const ref = accountRef(account.stableId)

      try {
        const balance = await this.provider.fetchBalance({
          session,
          account,
          psu,
          beforeRequest: async () => this.store.countRequest(row.id, ref, day(this.now())),
        })

        if (balance) {
          this.balances.save(userId, row.id, ref, balance, this.now())
        }
      } catch (e) {
        this.logger.warn(`Balance fetch failed: ${errorSummary(e)}`)
      }
    }
  }

  /**
   * The catch-up: every active connection that hasn't synced for `everyHours`, one at a time.
   * One failing connection never stops the others, and an expired consent just flips the status.
   */
  async syncDue(everyHours: number) {
    const now = this.now()
    const due = this.store.dueForSync(
      now.toISOString(),
      addMilliseconds(now, -AUTO_SYNC_LOOKBACK_MS(everyHours)).toISOString(),
    )
    const today = day(now)
    let done = 0

    for (const row of due) {
      const from = row.last_sync_to
        ? day(addDays(new Date(row.last_sync_to), -SYNC_OVERLAP_DAYS))
        : day(addDays(now, -DEFAULT_SYNC_HISTORY_DAYS))

      try {
        await this.runSync(row, from, today, 'scheduler', { longest: !row.last_sync_to })
        done++
      } catch {
        /* already logged and audited; try the next one */
      }
    }

    return done
  }
}
