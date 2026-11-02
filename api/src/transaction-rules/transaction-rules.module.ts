import { DynamicModule, Module } from '@nestjs/common'
import { BankingConfig } from '../bank-connections/config/bank-connections.tokens'
import { TransactionsModule } from '../transactions/transactions.module'
import { TransactionRulesController } from './transaction-rules.controller'
import { TransactionRulesRepository } from './transaction-rules.repository'

/** Needs the banking encryption key for the rule text, so it exists only while banking does. */
@Module({})
export class TransactionRulesModule {
  static forConfig(config: BankingConfig): DynamicModule {
    return {
      module: TransactionRulesModule,
      imports: [TransactionsModule.forConfig(config)],
      controllers: [TransactionRulesController],
      providers: [TransactionRulesRepository],
    }
  }
}
