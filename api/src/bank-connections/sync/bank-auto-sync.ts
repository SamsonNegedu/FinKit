import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { AUTO_SYNC_CHECK_INTERVAL_MS, AUTO_SYNC_STARTUP_DELAY_MS } from '../constants'
import { BankSyncService } from './bank-sync.service'
import { BankBackfillService } from './bank-backfill.service'
import { BANKING_CONFIG, BankingConfig } from '../config/bank-connections.tokens'

/** Quietly catches up every active connection, so history builds without anyone pressing Sync. */
@Injectable()
export class BankAutoSync implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('BankAutoSync')
  private timer?: NodeJS.Timeout
  private startup?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly syncs: BankSyncService,
    private readonly backfill: BankBackfillService,
    @Inject(BANKING_CONFIG) private readonly config: BankingConfig,
  ) {}

  onModuleInit() {
    if (!this.config.autoSyncHours) {
      return
    }
    this.timer = setInterval(() => void this.tick(), AUTO_SYNC_CHECK_INTERVAL_MS)
    this.timer.unref() // never keeps the process alive
    // If the app was stopped for a while, don't wait a whole check interval to catch up
    this.startup = setTimeout(() => void this.tick(), AUTO_SYNC_STARTUP_DELAY_MS)
    this.startup.unref()
    this.logger.log(`Scheduled sync every ${this.config.autoSyncHours}h`)
  }

  onModuleDestroy() {
    clearInterval(this.timer)
    clearTimeout(this.startup)
  }

  async tick() {
    if (this.running) {
      return 0
    }
    this.running = true
    try {
      const synced = await this.syncs.syncDue(this.config.autoSyncHours)

      // Older history only after the normal catch-up, so it never takes the requests that one needs
      await this.backfill.backfillDue()

      return synced
    } catch (e) {
      this.logger.error(e instanceof Error ? e.message : String(e))

      return 0
    } finally {
      this.running = false
    }
  }
}
