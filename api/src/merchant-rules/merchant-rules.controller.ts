import { HttpCode, Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../access/access.guard'
import { Actor } from '../access/access.settings'
import { CsrfGuard } from '../access/csrf.guard'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { MerchantRulesService } from './merchant-rules.service'
import { SaveRuleInput, SaveRuleSchema, SaveRulesInput, SaveRulesSchema } from './merchant-rules.schemas'

@Controller('api/learn')
@UseGuards(AccessGuard, CsrfGuard)
export class MerchantRulesController {
  constructor(private readonly service: MerchantRulesService) {}

  @Get('mappings')
  list(@CurrentActor() actor: Actor) {
    return { success: true, data: this.service.list(actor.userId) }
  }

  @Get('stats')
  stats(@CurrentActor() actor: Actor) {
    return { success: true, data: this.service.stats(actor.userId) }
  }

  @Post('mapping')
  @HttpCode(200) // the previous API answered 200, not 201
  learn(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(SaveRuleSchema)) body: SaveRuleInput) {
    this.service.learn(actor.userId, body.merchant, body.category, body.detail)

    return {
      success: true,
      message: `Learned: "${body.merchant}" → "${body.category}"`,
    }
  }

  @Post('mappings/batch')
  @HttpCode(200) // the previous API answered 200, not 201
  learnMany(@CurrentActor() actor: Actor, @Body(new ZodValidationPipe(SaveRulesSchema)) body: SaveRulesInput) {
    this.service.learnMany(actor.userId, body.mappings)

    return { success: true, message: `Saved ${body.mappings.length} mappings` }
  }

  @Delete('mapping/:merchant')
  forget(@CurrentActor() actor: Actor, @Param('merchant') merchant: string) {
    // Express has already decoded the path segment
    this.service.forget(actor.userId, merchant)

    return { success: true, message: `Deleted mapping for "${merchant}"` }
  }
}
