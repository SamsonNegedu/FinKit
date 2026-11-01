import { DynamicModule, Logger, Module } from '@nestjs/common'
import { ACCESS_REFUSED } from '../access/access.guard'
import { loadAccessSettings } from '../access/access.settings'
import { loadBankingConfig } from './banking.config'
import { BankAdminController } from './bank-admin.controller'
import { BankCallbackController } from './bank-callback.controller'
import { BankConnectionsController } from './bank-connections.controller'
import { BankConnectionsService } from './bank-connections.service'
import { BankConnectionsStore } from './bank-connections.store'
import { BANKING_CONFIG, BANKING_STATE, CLOCK } from './bank-connections.tokens'
import { BANK_PROVIDER } from './bank-provider'
import { BankingUnavailableController } from './banking-unavailable.controller'
import { EnableBankingProvider } from './providers/enable-banking.provider'
import { TestBankProvider } from './providers/test-bank.provider'
import { TestBankController } from './test-bank.controller'

@Module({})
export class BankConnectionsModule {
  /**
   * Decides once, at start-up, what to expose. Banking fails closed: when it is off, or set up
   * incorrectly (for example in production without sign-in), only a "disabled" status is served.
   */
  static forRoot(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const logger = new Logger('BankConnections')
    const access = loadAccessSettings(env)
    const { config, errors } = loadBankingConfig(env)
    const problems = [
      ...errors,
      ...(config && access.isProd && access.mode !== 'cloudflare'
        ? ['CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD are required in production']
        : []),
    ]

    if (!config || problems.length) {
      if (problems.length) logger.error(`Banking is disabled: ${problems.join('; ')}`)
      return {
        module: BankConnectionsModule,
        controllers: [BankingUnavailableController],
        providers: [{ provide: BANKING_STATE, useValue: problems.length ? 'misconfigured' : 'off' }],
      }
    }

    logger.log(`Banking enabled (${config.provider}, access: ${access.mode})`)
    const useTestBank = config.provider === 'mock'
    return {
      module: BankConnectionsModule,
      controllers: [
        BankConnectionsController,
        BankCallbackController,
        BankAdminController,
        ...(useTestBank && !config.isProd ? [TestBankController] : []),
      ],
      providers: [
        { provide: BANKING_CONFIG, useValue: config },
        { provide: CLOCK, useValue: { now: () => new Date() } },
        {
          provide: BANK_PROVIDER,
          useValue: useTestBank
            ? new TestBankProvider()
            : new EnableBankingProvider({ appId: config.ebAppId!, privateKey: config.ebPrivateKey! }),
        },
        BankConnectionsStore,
        BankConnectionsService,
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
