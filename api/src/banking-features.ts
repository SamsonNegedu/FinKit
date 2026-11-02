import { DynamicModule } from '@nestjs/common'
import { readyConfig, resolveBanking } from './bank-connections/banking-gate'
import { ContractsModule } from './contracts/contracts.module'
import { TransactionRulesModule } from './transaction-rules/transaction-rules.module'
import { TripsModule } from './trips/trips.module'

/**
 * The features built on synced bank transactions. They exist only when banking can run, which is decided in
 * one place (the same gate the connections use), so they are never served on their own.
 */
export function bankingFeatureModules(env: NodeJS.ProcessEnv = process.env): DynamicModule[] {
  const config = readyConfig(resolveBanking(env))

  return config
    ? [ContractsModule.forConfig(config), TripsModule.forConfig(config), TransactionRulesModule.forConfig(config)]
    : []
}
