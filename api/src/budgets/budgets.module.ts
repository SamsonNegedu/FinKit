import { Module } from '@nestjs/common'
import { BudgetCapController, BudgetsController } from './budgets.controller'
import { BudgetsRepository } from './budgets.repository'

/** Works with or without banking: limits apply to imported files as much as to synced transactions. */
@Module({ controllers: [BudgetsController, BudgetCapController], providers: [BudgetsRepository] })
export class BudgetsModule {}
