import { DynamicModule, Module } from '@nestjs/common'
import { BankingConfig } from '../bank-connections/config/bank-connections.tokens'
import { TransactionsModule } from '../transactions/transactions.module'
import { TripsController } from './trips.controller'
import { TripsRepository } from './trips.repository'
import { TripsService } from './trips.service'

/** Trips: a separate pot of spending made from stored bank transactions, so it exists only while banking does. */
@Module({})
export class TripsModule {
  static forConfig(config: BankingConfig): DynamicModule {
    return {
      module: TripsModule,
      imports: [TransactionsModule.forConfig(config)],
      controllers: [TripsController],
      providers: [TripsRepository, TripsService],
    }
  }
}
