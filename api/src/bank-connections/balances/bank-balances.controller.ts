import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { BankBalancesService } from './bank-balances.service'

@Controller('api/banking')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class BankBalancesController {
  constructor(private readonly balances: BankBalancesService) {}

  @Get('balances')
  list(@CurrentActor() actor: Actor) {
    return this.balances.list(actor.userId)
  }
}
