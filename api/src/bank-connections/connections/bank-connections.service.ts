import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import { ACCESS_SETTINGS, AccessSettings, Actor } from '../../access/access.settings'
import { accountRef, decrypt, encrypt, randomToken } from '../../shared/crypto/encryption'
import { BANK_PROVIDER, BankProvider, ProviderError } from '../providers/bank-provider'
import { BANKING_CONFIG, BankingConfig, CLOCK, Clock } from '../config/bank-connections.tokens'
import { BankConnectionsStore, ConnectionRow } from './bank-connections.store'
import { BankTransactionsStore } from '../transactions/bank-transactions.store'
import { ConnectInput } from './bank-connections.schemas'
import { EXPIRING_DAYS, connectionStatus } from './connection-status'
import { BANK_LIST_CACHE_TTL_MS, CONNECT_RATE_LIMIT_MAX_ATTEMPTS, CONNECT_RATE_LIMIT_WINDOW_MS } from '../constants'
import { addDays } from '../../shared/constants/time'
import { RateLimiter } from './rate-limiter'

const BANKS_URL = '/app/banks' // where the bank sends the user back to

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
    private readonly txs: BankTransactionsStore,
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
    const { status, daysLeft } = connectionStatus(row, this.now())
    const accounts = JSON.parse(row.account_labels) as Array<{
      id: string
      label: string
      currency?: string
      ownIban?: boolean
    }>

    return {
      id: row.id,
      bank: row.aspsp_name,
      country: row.aspsp_country,
      status,
      daysLeft,
      validUntil: row.valid_until,
      accounts: accounts.map(a => ({ id: a.id, label: a.label, currency: a.currency })),
      // Made before we kept the account's own IBAN: reconnecting lets transfers between accounts be spotted
      reconnectSuggested: accounts.some(a => a.ownIban === undefined),
      lastSyncAt: row.last_sync_at,
      lastSyncTo: row.last_sync_to,
      createdAt: row.created_at,
    }
  }

  status() {
    return {
      enabled: true,
      provider: this.provider.name,
      mock: this.provider.name === 'mock',
      expiringDays: EXPIRING_DAYS,
    }
  }

  async banks(country: string) {
    const hit = this.bankCache.get(country)

    if (hit && this.now().getTime() - hit.at < BANK_LIST_CACHE_TTL_MS) {
      return hit.banks
    }
    try {
      const banks = await this.provider.listBanks(country)

      this.bankCache.set(country, { at: this.now().getTime(), banks })

      return banks
    } catch {
      throw new BadGatewayException({ error: 'Could not load banks' })
    }
  }

  list(actor: Actor) {
    return this.store.listConnections(actor.userId).map(r => this.view(r))
  }

  // ---------------- connect ----------------
  async startConnection(actor: Actor, input: ConnectInput): Promise<{ url: string; state: string }> {
    if (!this.limiter.allow(`connect:${actor.email}`, CONNECT_RATE_LIMIT_WINDOW_MS, CONNECT_RATE_LIMIT_MAX_ATTEMPTS)) {
      throw new HttpException({ error: 'Too many attempts. Try again later.' }, 429)
    }
    if (input.reconnect && !this.store.getOwnedConnection(input.reconnect, actor.userId)) {
      throw new NotFoundException({ error: 'Unknown connection' })
    }

    const bank = (await this.banks(input.country.toUpperCase()).catch(() => [])).find(b => b.name === input.bank)

    if (!bank) {
      throw new BadRequestException({ error: 'Unknown bank' })
    }

    // One login covers all of a bank's accounts, so connecting a bank you already have replaces
    // the old link instead of adding a duplicate card.
    const existing = this.store
      .listConnections(actor.userId)
      .find(c => c.aspsp_name === bank.name && c.aspsp_country === bank.country)
    const replaces = input.reconnect ?? existing?.id

    const state = randomToken(32)
    const validUntil = addDays(this.now(), Math.max(1, Math.min(bank.maxConsentDays, 180)) - 0.05)

    try {
      const { url } = await this.provider.startAuth({
        bank,
        redirectUrl: this.config.redirectUrl,
        state,
        validUntil,
      })

      this.store.createState({
        state,
        userId: actor.userId,
        bankName: bank.name,
        country: bank.country,
        replaceConnectionId: replaces,
      })
      this.store.audit(actor.email, 'connect.start', bank.name, replaces ? { replaces } : undefined, actor.userId)

      return { url, state }
    } catch {
      throw new BadGatewayException({
        error: 'Could not start the connection',
      })
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
      this.store.audit('callback', 'connect.failed', undefined, {
        reason: 'state mismatch',
      })

      return { ok: false, reason: 'invalid' }
    }
    const pending = this.store.consumeState(p.state)

    if (!pending) {
      this.store.audit('callback', 'connect.failed', undefined, {
        reason: 'expired or reused',
      })

      return { ok: false, reason: 'expired' }
    }
    if (p.error || !p.code) {
      this.store.audit(
        'callback',
        'connect.denied',
        pending.aspsp_name,
        { error: p.error || 'no code' },
        pending.user_id,
      )

      return { ok: false, reason: 'denied' }
    }
    try {
      const session = await this.provider.completeAuth(p.code)
      // What this bank needs to treat a Sync press as a person being present (see PSU headers)
      const bank = (await this.banks(pending.aspsp_country).catch(() => [])).find(b => b.name === pending.aspsp_name)

      const old = pending.replace_connection_id ? this.store.getConnection(pending.replace_connection_id) : undefined
      const id = this.store.createConnection({
        // The bank sends the browser back without a sign-in, so the owner is whoever started this request
        userId: pending.user_id!,
        provider: this.provider.name,
        bankName: pending.aspsp_name,
        country: pending.aspsp_country,
        secretBlob: encrypt(
          JSON.stringify({
            sessionId: session.sessionId,
            accounts: session.accounts,
            requiredPsuHeaders: bank?.requiredPsuHeaders,
          }),
          this.config.encryptionKey,
        ),
        accountLabels: session.accounts.map(a => ({
          id: accountRef(a.stableId),
          label: a.label,
          currency: a.currency,
          ownIban: !!a.iban, // lets old connections (made before this was kept) be told apart
        })),
        validUntil: session.validUntil,
        lastSyncTo: old?.last_sync_to ?? null, // keep syncing from where the old connection stopped
      })

      if (old && old.status !== 'revoked') {
        await this.revokeAtBank(old)
        this.store.retire(old.id, 'replaced')
        // Same accounts, new consent: the history carries over
        this.txs.moveConnection(pending.user_id!, old.id, id)
      }
      this.store.audit(
        'callback',
        'connect.complete',
        pending.aspsp_name,
        {
          accounts: session.accounts.length,
          connection: id,
        },
        pending.user_id,
      )

      return { ok: true, connectionId: id }
    } catch (e) {
      this.store.audit(
        'callback',
        'connect.failed',
        pending.aspsp_name,
        {
          reason: e instanceof ProviderError ? e.kind : 'error',
        },
        pending.user_id,
      )

      return { ok: false, reason: 'failed' }
    }
  }

  static returnUrl(outcome: CallbackOutcome): string {
    return outcome.ok
      ? `${BANKS_URL}?bank=connected&c=${outcome.connectionId}`
      : `${BANKS_URL}?bank=error&reason=${outcome.reason}`
  }

  async disconnect(actor: Actor, id: string) {
    const row = this.store.getOwnedConnection(id, actor.userId)

    if (!row) {
      throw new NotFoundException({ error: 'Not found' })
    }
    await this.revokeAtBank(row)
    this.store.retire(row.id, 'revoked')
    // Disconnecting removes what was synced through it
    const deleted = this.txs.deleteForConnection(actor.userId, row.id)

    this.store.audit(actor.email, 'disconnect', row.aspsp_name, { deleted }, actor.userId)

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
  overview(actor: Actor) {
    const conns = this.store.listConnections(actor.userId).map(r => this.view(r))
    const last = this.store.lastSuccessfulSync(actor.userId)
    const { access, config, provider } = this

    return {
      provider: provider.name,
      connections: {
        total: conns.length,
        active: conns.filter(c => c.status === 'active').length,
        expiring: conns.filter(c => c.status === 'expiring').length,
        expired: conns.filter(c => c.status === 'expired').length,
      },
      syncs30d: this.store.syncStats(actor.userId, 30),
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
          id: 'people',
          ok: access.allowedEmails.length > 0,
          label: `${access.allowedEmails.length || 'No'} ${access.allowedEmails.length === 1 ? 'person is' : 'people are'} allowed in`,
          detail: access.mode === 'dev' ? 'development: no sign-in' : 'each with their own separate data',
        },
      ],
    }
  }

  syncLog(actor: Actor, limit: number) {
    return {
      entries: this.store.syncLog(actor.userId, Math.min(limit || 100, 500)),
    }
  }

  auditLog(actor: Actor, limit: number) {
    return {
      entries: this.store.auditLog(actor.userId, Math.min(limit || 100, 500)),
    }
  }

  /** Test bank only: ages a connection so the expiring and expired states can be seen. */
  ageConnection(actor: Actor, id: string, mode: 'expiring' | 'expired') {
    const row = this.store.getOwnedConnection(id, actor.userId)

    if (!row) {
      throw new NotFoundException({ error: 'Not found' })
    }
    this.store.setValidUntil(row.id, addDays(this.now(), mode === 'expired' ? -1 : 9).toISOString())
    if (mode === 'expired') {
      this.store.setStatus(row.id, 'expired')
    }
    this.store.audit(actor.email, 'test.expire', row.aspsp_name, { mode }, actor.userId)

    return { ok: true }
  }
}
