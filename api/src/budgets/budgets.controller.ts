import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Put, UseGuards } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../access/access.guard'
import { Actor } from '../access/access.settings'
import { CsrfGuard } from '../access/csrf.guard'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { BudgetsRepository } from './budgets.repository'
import {
  CategoryParamSchema,
  CurrencySchema,
  SaveBudgetInput,
  SaveBudgetSchema,
  SaveCapInput,
  SaveCapSchema,
} from './budgets.schemas'

const category = new ZodValidationPipe(CategoryParamSchema)
const currency = new ZodValidationPipe(CurrencySchema)

/** Monthly limits per category. Spending is worked out in the browser, so nothing here touches transactions. */
@Controller('api/budgets')
@UseGuards(AccessGuard, CsrfGuard)
export class BudgetsController {
  constructor(private readonly budgets: BudgetsRepository) {}

  @Get()
  list(@CurrentActor() actor: Actor) {
    return { budgets: this.budgets.list(actor.userId), caps: this.budgets.caps(actor.userId) }
  }

  @Put()
  save(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(SaveBudgetSchema)) body: SaveBudgetInput) {
    this.budgets.save(actor.userId, body)

    return body
  }

  @Delete(':currency/:category')
  @HttpCode(204)
  remove(
    @CurrentActor() actor: Actor,
    @Param('currency', currency) cur: string,
    @Param('category', category) cat: string,
  ) {
    if (!this.budgets.remove(actor.userId, cat, cur)) {
      throw new NotFoundException('No such budget')
    }
  }
}

/** One cap on all spending in a month, per currency. A separate path, so it can never be mistaken for a category. */
@Controller('api/budget-cap')
@UseGuards(AccessGuard, CsrfGuard)
export class BudgetCapController {
  constructor(private readonly budgets: BudgetsRepository) {}

  @Put()
  save(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(SaveCapSchema)) body: SaveCapInput) {
    this.budgets.saveCap(actor.userId, body)

    return body
  }

  @Delete(':currency')
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param('currency', currency) cur: string) {
    if (!this.budgets.removeCap(actor.userId, cur)) {
      throw new NotFoundException('No such cap')
    }
  }
}
