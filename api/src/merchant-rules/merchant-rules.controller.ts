import { HttpCode, Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { MerchantRulesService } from './merchant-rules.service'
import { SaveRuleInput, SaveRuleSchema, SaveRulesInput, SaveRulesSchema } from './merchant-rules.schemas'

@Controller('api/learn')
export class MerchantRulesController {
  constructor(private readonly service: MerchantRulesService) {}

  @Get('mappings')
  list() {
    return { success: true, data: this.service.list() }
  }

  @Get('stats')
  stats() {
    return { success: true, data: this.service.stats() }
  }

  @Post('mapping')
  @HttpCode(200) // the previous API answered 200, not 201
  learn(@Body(new ZodValidationPipe(SaveRuleSchema)) body: SaveRuleInput) {
    this.service.learn(body.merchant, body.category)
    return { success: true, message: `Learned: "${body.merchant}" → "${body.category}"` }
  }

  @Post('mappings/batch')
  @HttpCode(200) // the previous API answered 200, not 201
  learnMany(@Body(new ZodValidationPipe(SaveRulesSchema)) body: SaveRulesInput) {
    this.service.learnMany(body.mappings)
    return { success: true, message: `Saved ${body.mappings.length} mappings` }
  }

  @Delete('mapping/:merchant')
  forget(@Param('merchant') merchant: string) {
    // Express has already decoded the path segment
    this.service.forget(merchant)
    return { success: true, message: `Deleted mapping for "${merchant}"` }
  }
}
