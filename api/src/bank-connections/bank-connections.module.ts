import { DynamicModule, Logger, Module } from '@nestjs/common'
import { ACCESS_REFUSED } from '../access/access.guard'
import { BankAdminController } from './admin/bank-admin.controller'
import { BankCallbackController } from './connections/bank-callback.controller'
import { BankConnectionsController } from './connections/bank-connections.controller'
import { BankConnectionsService } from './connections/bank-connections.service'
import { BankAutoSync } from './sync/bank-auto-sync'
import { BankSyncController } from './sync/bank-sync.controller'
import { BankBalancesController } from './balances/bank-balances.controller'
import { BankBalancesService } from './balances/bank-balances.service'
import { BankBalancesStore } from './balances/bank-balances.store'
import { BankSyncService } from './sync/bank-sync.service'
import { BankBackfillService } from './sync/bank-backfill.service'
import { StoredTransactionsController } from './transactions/stored-transactions.controller'
import { StoredTransactionsService } from './transactions/stored-transactions.service'
import { BankConnectionsStore } from './connections/bank-connections.store'
import { TransactionsModule } from '../transactions/transactions.module'
import { resolveBanking } from './banking-gate'
import { BANKING_STATE, CLOCK } from './config/bank-connections.tokens'
import { BANK_PROVIDER } from './providers/bank-provider'
import { BankingUnavailableController } from './banking-unavailable.controller'
import { EnableBankingProvider } from './providers/enable-banking.provider'
import { TestBankProvider } from './providers/test-bank.provider'
import { TestBankController } from './providers/test-bank.controller'

@Module({})
export class BankConnectionsModule {
  /**
   * Decides once, at start-up, what to expose. Banking fails closed: when it is off, or set up
   * incorrectly (for example in production without sign-in), only a "disabled" status is served.
   */
  static forRoot(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const logger = new Logger('BankConnections')
    const { access, config, problems } = resolveBanking(env)

    if (!config || problems.length) {
      if (problems.length) {
        logger.error(`Banking is disabled: ${problems.join('; ')}`)
      }

      return {
        module: BankConnectionsModule,
        controllers: [BankingUnavailableController],
        providers: [
          {
            provide: BANKING_STATE,
            useValue: problems.length ? 'misconfigured' : 'off',
          },
        ],
      }
    }

    logger.log(`Banking enabled (${config.provider}, access: ${access.mode})`)
    const useTestBank = config.provider === 'mock'

    return {
      module: BankConnectionsModule,
      // The stored transactions (and the config they are encrypted with) are shared with trips and contracts
      imports: [TransactionsModule.forConfig(config)],
      controllers: [
        BankConnectionsController,
        BankSyncController,
        StoredTransactionsController,
        BankBalancesController,
        BankCallbackController,
        BankAdminController,
        ...(useTestBank && !config.isProd ? [TestBankController] : []),
      ],
      providers: [
        { provide: CLOCK, useValue: { now: () => new Date() } },
        {
          provide: BANK_PROVIDER,
          useValue: useTestBank
            ? new TestBankProvider()
            : new EnableBankingProvider({
                appId: config.ebAppId!,
                privateKey: config.ebPrivateKey!,
              }),
        },
        BankConnectionsStore,
        BankBalancesStore,
        BankBalancesService,
        BankConnectionsService,
        BankSyncService,
        BankBackfillService,
        StoredTransactionsService,
        BankAutoSync,
        // Refused sign-ins are recorded in the bank audit log
        {
          provide: ACCESS_REFUSED,
          inject: [BankConnectionsStore],
          useFactory: (store: BankConnectionsStore) => (path: string, reason: string) =>
            store.audit('unknown', 'access.refused', path, { reason }),
        },
      ],
    }
  }
}
