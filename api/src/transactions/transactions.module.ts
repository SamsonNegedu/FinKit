import { DynamicModule, Module } from '@nestjs/common'
import { BANKING_CONFIG, BankingConfig } from '../bank-connections/config/bank-connections.tokens'
import { BankTransactionsStore } from './bank-transactions.store'
import { TransactionHooks } from './transaction-hooks'

const made = new WeakMap<BankingConfig, DynamicModule>()

/**
 * The stored transactions and the hooks around them: what bank sync writes and what trips and contracts read.
 * Each user of it asks for the same module for one config, so there is exactly one store and one set of hooks.
 */
@Module({})
export class TransactionsModule {
  static forConfig(config: BankingConfig): DynamicModule {
    const existing = made.get(config)

    if (existing) {
      return existing
    }
    const module: DynamicModule = {
      module: TransactionsModule,
      providers: [{ provide: BANKING_CONFIG, useValue: config }, BankTransactionsStore, TransactionHooks],
      exports: [BANKING_CONFIG, BankTransactionsStore, TransactionHooks],
    }

    made.set(config, module)

    return module
  }
}
