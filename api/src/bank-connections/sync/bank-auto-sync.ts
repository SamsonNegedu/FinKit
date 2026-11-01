import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { AUTO_SYNC_CHECK_INTERVAL_MS } from '../constants'
import { BankSyncService } from './bank-sync.service'
import { BANKING_CONFIG, BankingConfig } from '../config/bank-connections.tokens'

/** Quietly catches up every active connection, so history builds without anyone pressing Sync. */
@Injectable()
export class BankAutoSync implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('BankAutoSync')
  private timer?: NodeJS.Timeout
  private running = false

  constructor(
    private readonly syncs: BankSyncService,
    @Inject(BANKING_CONFIG) private readonly config: BankingConfig,
  ) {}

  onModuleInit() {
    if (!this.config.autoSyncHours) {
      return
    }
    this.timer = setInterval(() => void this.tick(), AUTO_SYNC_CHECK_INTERVAL_MS)
    this.timer.unref() // never keeps the process alive
    this.logger.log(`Scheduled sync every ${this.config.autoSyncHours}h`)
  }

  onModuleDestroy() {
    clearInterval(this.timer)
  }

  async tick() {
    if (this.running) {
      return 0
    }
    this.running = true
    try {
      return await this.syncs.syncDue(this.config.autoSyncHours)
    } catch (e) {
      this.logger.error(e instanceof Error ? e.message : String(e))

      return 0
    } finally {
      this.running = false
    }
  }
}
