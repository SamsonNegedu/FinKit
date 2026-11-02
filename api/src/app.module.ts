import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AccessModule } from './access/access.module'
import { BudgetsModule } from './budgets/budgets.module'
import { BankConnectionsModule } from './bank-connections/bank-connections.module'
import { bankingFeatureModules } from './banking-features'
import { HealthModule } from './health/health.module'
import { MerchantRulesModule } from './merchant-rules/merchant-rules.module'
import { SettingsModule } from './settings/settings.module'
import { SheetExportModule } from './sheet-export/sheet-export.module'
import { UsersModule } from './users/users.module'
import { DatabaseModule } from './shared/database/database.module'
import { RequestLoggerMiddleware } from './shared/http/request-logger.middleware'

@Module({
  imports: [
    DatabaseModule.forRoot(),
    UsersModule,
    AccessModule.forRoot(),
    HealthModule,
    MerchantRulesModule,
    BudgetsModule,
    SettingsModule,
    SheetExportModule,
    BankConnectionsModule.forRoot(),
    ...bankingFeatureModules(),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}')
  }
}
