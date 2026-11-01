import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AccessModule } from './access/access.module'
import { BankConnectionsModule } from './bank-connections/bank-connections.module'
import { HealthModule } from './health/health.module'
import { MerchantRulesModule } from './merchant-rules/merchant-rules.module'
import { SettingsModule } from './settings/settings.module'
import { SheetExportModule } from './sheet-export/sheet-export.module'
import { DatabaseModule } from './shared/database/database.module'
import { RequestLoggerMiddleware } from './shared/http/request-logger.middleware'

@Module({
  imports: [
    DatabaseModule.forRoot(),
    AccessModule.forRoot(),
    HealthModule,
    MerchantRulesModule,
    SettingsModule,
    SheetExportModule,
    BankConnectionsModule.forRoot(),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*path}')
  }
}
