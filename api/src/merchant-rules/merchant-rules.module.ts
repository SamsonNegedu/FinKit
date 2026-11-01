import { Module } from '@nestjs/common'
import { MerchantRulesController } from './merchant-rules.controller'
import { MerchantRulesRepository } from './merchant-rules.repository'
import { MerchantRulesService } from './merchant-rules.service'

@Module({
  controllers: [MerchantRulesController],
  providers: [MerchantRulesService, MerchantRulesRepository],
  exports: [MerchantRulesService],
})
export class MerchantRulesModule {}
