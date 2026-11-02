import { DynamicModule, Module } from '@nestjs/common'
import { BankingConfig } from '../bank-connections/config/bank-connections.tokens'
import { MerchantRulesModule } from '../merchant-rules/merchant-rules.module'
import { SettingsModule } from '../settings/settings.module'
import { TransactionsModule } from '../transactions/transactions.module'
import { ContractsController } from './contracts.controller'
import { ContractsRepository } from './contracts.repository'
import { ContractsService } from './contracts.service'

/** Contracts: payments that repeat, found in stored bank transactions. They read the person's rules and categories. */
@Module({})
export class ContractsModule {
  static forConfig(config: BankingConfig): DynamicModule {
    return {
      module: ContractsModule,
      imports: [TransactionsModule.forConfig(config), MerchantRulesModule, SettingsModule],
      controllers: [ContractsController],
      providers: [ContractsRepository, ContractsService],
    }
  }
}
