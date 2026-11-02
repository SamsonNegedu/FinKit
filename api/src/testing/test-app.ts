import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AccessModule } from '../access/access.module'
import { ACCESS_VERIFIER, AccessVerifier } from '../access/access.settings'
import { BankConnectionsModule } from '../bank-connections/bank-connections.module'
import { bankingFeatureModules } from '../banking-features'
import { BANK_PROVIDER, BankProvider } from '../bank-connections/providers/bank-provider'
import { CLOCK, Clock } from '../bank-connections/config/bank-connections.tokens'
import { configureApp } from '../app.setup'
import { HealthModule } from '../health/health.module'
import { MerchantRulesModule } from '../merchant-rules/merchant-rules.module'
import { SettingsModule } from '../settings/settings.module'
import { SheetExportModule } from '../sheet-export/sheet-export.module'
import { DatabaseModule } from '../shared/database/database.module'
import { UsersModule } from '../users/users.module'
import { DatabaseService } from '../shared/database/database.service'
import { BankConnectionsStore } from '../bank-connections/connections/bank-connections.store'
import { BankBackfillService } from '../bank-connections/sync/bank-backfill.service'
import { BankSyncService } from '../bank-connections/sync/bank-sync.service'

export const TEST_KEY = Buffer.alloc(32, 9)
export const SIGNED_IN_HEADERS = {
  'Content-Type': 'application/json',
  'X-FinKit': '1',
}

export interface TestAppOptions {
  env?: NodeJS.ProcessEnv
  provider?: BankProvider
  verify?: AccessVerifier | null
  clock?: Clock
  /** Use a real database file instead of memory (to test upgrades of existing data). */
  databaseFile?: string
}

/** The whole app, wired the same way as in production, on an in-memory database. */
export async function createTestApp(options: TestAppOptions = {}) {
  const env = {
    NODE_ENV: 'test',
    BANKING_PROVIDER: 'mock',
    BANKING_ENCRYPTION_KEY: TEST_KEY.toString('base64'),
    ...options.env,
  }
  let builder = Test.createTestingModule({
    imports: [
      DatabaseModule.forRoot(options.databaseFile ?? ':memory:'),
      UsersModule,
      AccessModule.forRoot(env),
      HealthModule,
      MerchantRulesModule,
      SettingsModule,
      SheetExportModule,
      BankConnectionsModule.forRoot(env),
      ...bankingFeatureModules(env),
    ],
  })

  if (options.provider) {
    builder = builder.overrideProvider(BANK_PROVIDER).useValue(options.provider)
  }
  if (options.clock) {
    builder = builder.overrideProvider(CLOCK).useValue(options.clock)
  }
  if (options.verify !== undefined) {
    builder = builder.overrideProvider(ACCESS_VERIFIER).useValue(options.verify)
  }
  const moduleRef = await builder.compile()
  const app: INestApplication = moduleRef.createNestApplication()

  configureApp(app, env)
  await app.init()

  return {
    app,
    server: app.getHttpServer(),
    db: moduleRef.get(DatabaseService).db,
    store: (() => {
      try {
        return moduleRef.get(BankConnectionsStore)
      } catch {
        return undefined
      }
    })(),
    backfill: (() => {
      try {
        return moduleRef.get(BankBackfillService)
      } catch {
        return undefined
      }
    })(),
    syncs: (() => {
      try {
        return moduleRef.get(BankSyncService)
      } catch {
        return undefined
      }
    })(),
    close: () => app.close(),
  }
}
