import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../access/access.guard'
import { Actor } from '../access/access.settings'
import { CsrfGuard } from '../access/csrf.guard'
import { NoStoreInterceptor } from '../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { TransactionRulesRepository } from './transaction-rules.repository'
import { CreateRuleInput, CreateRuleSchema, RuleIdSchema } from './transaction-rules.schemas'

/** Rules the person made from a transaction ("rows like this are Internet"). Applied in the browser. */
@Controller('api/transaction-rules')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class TransactionRulesController {
  constructor(private readonly rules: TransactionRulesRepository) {}

  @Get()
  list(@CurrentActor() actor: Actor) {
    return { rules: this.rules.list(actor.userId) }
  }

  @Post()
  create(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(CreateRuleSchema)) body: CreateRuleInput) {
    return this.rules.add(actor.userId, body.match, body.category, body.detail)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param('id', new ZodValidationPipe(RuleIdSchema)) id: string) {
    if (!this.rules.remove(actor.userId, id)) {
      throw new NotFoundException('No such rule')
    }
  }
}
