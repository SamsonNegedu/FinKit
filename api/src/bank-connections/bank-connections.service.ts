import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import { ACCESS_SETTINGS, AccessSettings, Actor } from '../access/access.settings'
import { accountRef, decrypt, encrypt, randomToken } from '../shared/crypto/encryption'
import { BANK_PROVIDER, BankProvider, BankTransaction, ProviderError, ProviderSession } from './bank-provider'
import { BANKING_CONFIG, BankingConfig, CLOCK, Clock } from './bank-connections.tokens'
import { BankConnectionsStore, ConnectionRow } from './bank-connections.store'
import { ConnectInput, SyncInput } from './bank-connections.schemas'
import { RateLimiter } from './rate-limiter'

const BANKS_URL = '/app/banks' // where the bank sends the user back to
const EXPIRING_DAYS = 14
const MIN_SYNC_INTERVAL_MS = 60_000
const MAX_RANGE_DAYS = 366
const OVERLAP_DAYS = 3 // re-fetch a few days already seen; repeats are skipped by the bank's own ids
const DEFAULT_HISTORY_DAYS = 90

const day = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000)

/** Why the bank's return didn't produce a connection (shown to the user as a friendly message). */
type CallbackOutcome =
  | { ok: true; connectionId: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'denied' | 'failed' }

@Injectable()
export class BankConnectionsService implements OnModuleInit {
  private readonly limiter: RateLimiter
  private readonly bankCache = new Map<string, { at: number; banks: Awaited<ReturnType<BankProvider['listBanks']>> }>()

  constructor(
    private readonly store: BankConnectionsStore,
    @Inject(BANK_PROVIDER) readonly provider: BankProvider,
    @Inject(BANKING_CONFIG) readonly config: BankingConfig,
    @Inject(ACCESS_SETTINGS) private readonly access: AccessSettings,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.limiter = new RateLimiter(() => this.clock.now().getTime())
  }

  onModuleInit() {
    this.store.prune()
  }

  private now() {
    return this.clock.now()
  }

  // ---------------- views ----------------
  view(row: ConnectionRow) {
    const left = Math.ceil((new Date(row.valid_until).getTime() - this.now().getTime()) / 86400_000)
    const status = row.status === 'expired' || left <= 0 ? 'expired' : left <= EXPIRING_DAYS ? 'expiring' : 'active'
    return {
      id: row.id,
      bank: row.aspsp_name,
      country: row.aspsp_country,
      status,
      daysLeft: Math.max(left, 0),
      validUntil: row.valid_until,
      accounts: JSON.parse(row.account_labels) as Array<{ id: string; label: string; currency?: string }>,
      lastSyncAt: row.last_sync_at,
      lastSyncTo: row.last_sync_to,
      createdAt: row.created_at,
    }
  }

  status(actor: Actor) {
    return {
      enabled: true,
      provider: this.provider.name,
      mock: this.provider.name === 'mock',
      canAdmin: actor.admin,
      expiringDays: EXPIRING_DAYS,
    }
  }

  async banks(country: string) {
    const hit = this.bankCache.get(country)
    if (hit && this.now().getTime() - hit.at < 3600_000) return hit.banks
    try {
      const banks = await this.provider.listBanks(country)
      this.bankCache.set(country, { at: this.now().getTime(), banks })
      return banks
    } catch {
      throw new BadGatewayException({ error: 'Could not load banks' })
    }
  }

  list() {
    return this.store.listConnections().map(r => this.view(r))
  }

  // ---------------- connect ----------------
  async startConnection(actor: Actor, input: ConnectInput): Promise<{ url: string; state: string }> {
    if (!this.limiter.allow(`connect:${actor.email}`, 600_000, 10))
      throw new HttpException({ error: 'Too many attempts. Try again later.' }, 429)
    if (input.reconnect && !this.store.getConnection(input.reconnect))
      throw new NotFoundException({ error: 'Unknown connection' })

    const bank = (await this.banks(input.country.toUpperCase()).catch(() => [])).find(b => b.name === input.bank)
    if (!bank) throw new BadRequestException({ error: 'Unknown bank' })

    // One login covers all of a bank's accounts, so connecting a bank you already have replaces
    // the old link instead of adding a duplicate card.
    const existing = this.store
      .listConnections()
      .find(c => c.aspsp_name === bank.name && c.aspsp_country === bank.country)
    const replaces = input.reconnect ?? existing?.id

    const state = randomToken(32)
    const validUntil = addDays(this.now(), Math.max(1, Math.min(bank.maxConsentDays, 180)) - 0.05)
    try {
      const { url } = await this.provider.startAuth({ bank, redirectUrl: this.config.redirectUrl, state, validUntil })
      this.store.createState({
        state,
        bankName: bank.name,
        country: bank.country,
        replaceConnectionId: replaces,
      })
      this.store.audit(actor.email, 'connect.start', bank.name, replaces ? { replaces } : undefined)
      return { url, state }
    } catch {
      throw new BadGatewayException({ error: 'Could not start the connection' })
    }
  }

  /** The bank sent the user back. Valid only for a request we started, from the same browser, once. */
  async completeConnection(p: {
    state: string
    code?: string
    error?: string
    cookieState?: string
  }): Promise<CallbackOutcome> {
    if (!p.state || !p.cookieState || p.cookieState !== p.state) {
      this.store.audit('callback', 'connect.failed', undefined, { reason: 'state mismatch' })
      return { ok: false, reason: 'invalid' }
    }
    const pending = this.store.consumeState(p.state)
    if (!pending) {
      this.store.audit('callback', 'connect.failed', undefined, { reason: 'expired or reused' })
      return { ok: false, reason: 'expired' }
    }
    if (p.error || !p.code) {
      this.store.audit('callback', 'connect.denied', pending.aspsp_name, { error: p.error || 'no code' })
      return { ok: false, reason: 'denied' }
    }
    try {
      const session = await this.provider.completeAuth(p.code)
      const old = pending.replace_connection_id ? this.store.getConnection(pending.replace_connection_id) : undefined
      const id = this.store.createConnection({
        provider: this.provider.name,
        bankName: pending.aspsp_name,
        country: pending.aspsp_country,
        secretBlob: encrypt(
          JSON.stringify({ sessionId: session.sessionId, accounts: session.accounts }),
          this.config.encryptionKey,
        ),
        accountLabels: session.accounts.map(a => ({
          id: accountRef(a.stableId),
          label: a.label,
          currency: a.currency,
        })),
        validUntil: session.validUntil,
        lastSyncTo: old?.last_sync_to ?? null, // keep syncing from where the old connection stopped
      })
      if (old && old.status !== 'revoked') {
        await this.revokeAtBank(old)
        this.store.retire(old.id, 'replaced')
      }
      this.store.audit('callback', 'connect.complete', pending.aspsp_name, {
        accounts: session.accounts.length,
        connection: id,
      })
      return { ok: true, connectionId: id }
    } catch (e) {
      this.store.audit('callback', 'connect.failed', pending.aspsp_name, {
        reason: e instanceof ProviderError ? e.kind : 'error',
      })
      return { ok: false, reason: 'failed' }
    }
  }

  static returnUrl(outcome: CallbackOutcome): string {
    return outcome.ok
      ? `${BANKS_URL}?bank=connected&c=${outcome.connectionId}`
      : `${BANKS_URL}?bank=error&reason=${outcome.reason}`
  }

  // ---------------- sync ----------------
  async sync(actor: Actor, id: string, input: SyncInput) {
    const row = this.store.getConnection(id)
    if (!row || row.status === 'revoked' || row.status === 'replaced')
      throw new NotFoundException({ error: 'Not found' })
    if (this.view(row).status === 'expired') throw new ConflictException({ error: 'expired' })

    const today = day(this.now())
    const to = input.to && input.to < today ? input.to : today
    const from =
      input.from ??
      (row.last_sync_to
        ? day(addDays(new Date(row.last_sync_to), -OVERLAP_DAYS))
        : day(addDays(this.now(), -DEFAULT_HISTORY_DAYS)))
    if (from > to || (new Date(to).getTime() - new Date(from).getTime()) / 86400_000 > MAX_RANGE_DAYS)
      throw new BadRequestException({ error: 'Invalid date range' })

    // Banks limit how often access without a user present is allowed; stay well inside that
    if (
      row.last_sync_started_at &&
      this.now().getTime() - new Date(row.last_sync_started_at).getTime() < MIN_SYNC_INTERVAL_MS
    ) {
      throw new HttpException({ error: 'Please wait a minute before syncing again.' }, 429)
    }
    this.store.markSyncStarted(row.id, this.now().toISOString())
    const logId = this.store.startSyncLog(row.id, from, to)
    try {
      const secret = JSON.parse(decrypt(row.secret_blob, this.config.encryptionKey)) as Pick<
        ProviderSession,
        'sessionId' | 'accounts'
      >
      const session: ProviderSession = { ...secret, validUntil: row.valid_until }
      const all: BankTransaction[] = []
      for (const account of session.accounts) {
        const fetched = await this.provider.fetchTransactions({ session, account, from, to })
        // Stamp where each one came from, so the app can browse bank → account → transactions
        for (const tx of fetched) {
          tx.bankName = row.aspsp_name
          tx.accountLabel = account.label
          tx.accountRef = accountRef(account.stableId)
        }
        all.push(...fetched)
      }
      all.sort((a, b) => b.date.localeCompare(a.date))
      this.store.markSyncDone(row.id, to, this.now().toISOString())
      this.store.finishSyncLog(logId, 'ok', all.length)
      this.store.audit(actor.email, 'sync', row.aspsp_name, { fetched: all.length })
      return { transactions: all, from, to, count: all.length }
    } catch (e) {
      const kind = e instanceof ProviderError ? e.kind : 'unavailable'
      if (kind === 'consent_expired') this.store.setStatus(row.id, 'expired')
      this.store.finishSyncLog(logId, kind === 'rate_limited' ? 'rate_limited' : 'failed', 0, kind)
      this.store.audit(actor.email, 'sync.failed', row.aspsp_name, { kind })
      const status = kind === 'consent_expired' ? 409 : kind === 'rate_limited' ? 429 : 502
      throw new HttpException({ error: kind === 'consent_expired' ? 'expired' : kind }, status)
    }
  }

  async disconnect(actor: Actor, id: string) {
    const row = this.store.getConnection(id)
    if (!row) throw new NotFoundException({ error: 'Not found' })
    await this.revokeAtBank(row)
    this.store.retire(row.id, 'revoked')
    this.store.audit(actor.email, 'disconnect', row.aspsp_name)
    return { ok: true }
  }

  private async revokeAtBank(row: ConnectionRow) {
    try {
      const s = JSON.parse(decrypt(row.secret_blob, this.config.encryptionKey)) as { sessionId: string }
      await this.provider.revoke(s.sessionId)
    } catch {
      /* already gone or nothing stored */
    }
  }

  // ---------------- back office ----------------
  overview() {
    const conns = this.list()
    const last = this.store.lastSuccessfulSync()
    const { access, config, provider } = this
    return {
      provider: provider.name,
      connections: {
        total: conns.length,
        active: conns.filter(c => c.status === 'active').length,
        expiring: conns.filter(c => c.status === 'expiring').length,
        expired: conns.filter(c => c.status === 'expired').length,
      },
      syncs30d: this.store.syncStats(30),
      lastSuccessfulSync: last ? { at: last.finished_at, bank: last.bank } : null,
      checks: [
        {
          id: 'provider',
          ok: true,
          label: 'Bank provider',
          detail: provider.name === 'mock' ? 'Test bank (development)' : 'Enable Banking',
        },
        {
          id: 'signing',
          ok: provider.name === 'mock' || !!config.ebPrivateKey,
          label: 'Request signing key loaded',
          detail:
            provider.name === 'mock'
              ? 'not needed for the test bank'
              : `RS256 · app id …${(config.ebAppId || '').slice(-4)}`,
        },
        {
          id: 'encryption',
          ok: !config.usesDevKey,
          label: 'Stored links are encrypted with your own key',
          detail: config.usesDevKey ? 'using the development key' : 'AES-256-GCM',
        },
        {
          id: 'access',
          ok: access.mode === 'cloudflare',
          label: 'Sign-in required (Cloudflare Access)',
          detail: access.mode === 'cloudflare' ? 'token verified on every request' : 'development mode: no sign-in',
        },
        {
          id: 'https',
          ok: config.redirectUrl.startsWith('https://'),
          label: 'Return address uses https',
          detail: config.redirectUrl,
        },
        {
          id: 'mock',
          ok: !(config.isProd && provider.name === 'mock'),
          label: 'Test bank is blocked in production',
          detail: provider.name === 'mock' ? 'test bank is active (development)' : 'refused at startup',
        },
        {
          id: 'admins',
          ok: access.adminEmails.length > 1 || access.mode === 'dev',
          warn: access.adminEmails.length === 1,
          label: `Admin list has ${access.adminEmails.length || 'no'} address${access.adminEmails.length === 1 ? '' : 'es'}`,
          detail:
            access.adminEmails.join(', ') || (access.mode === 'dev' ? 'development: everyone is admin' : 'none set'),
        },
      ],
    }
  }
  syncLog(limit: number) {
    return { entries: this.store.syncLog(Math.min(limit || 100, 500)) }
  }
  auditLog(limit: number) {
    return { entries: this.store.auditLog(Math.min(limit || 100, 500)) }
  }

  /** Test bank only: ages a connection so the expiring and expired states can be seen. */
  ageConnection(actor: Actor, id: string, mode: 'expiring' | 'expired') {
    const row = this.store.getConnection(id)
    if (!row) throw new NotFoundException({ error: 'Not found' })
    this.store.setValidUntil(row.id, addDays(this.now(), mode === 'expired' ? -1 : 9).toISOString())
    if (mode === 'expired') this.store.setStatus(row.id, 'expired')
    this.store.audit(actor.email, 'admin.expire', row.aspsp_name, { mode })
    return { ok: true }
  }
}
