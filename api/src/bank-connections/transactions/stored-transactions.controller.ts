import { BadRequestException, Controller, Delete, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { StoredTransactionsService } from './stored-transactions.service'

/** What the server holds for the signed-in user. */
@Controller('api/banking')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class StoredTransactionsController {
  constructor(private readonly stored: StoredTransactionsService) {}

  /** Everything stored for the signed-in user (optionally one date range). */
  @Get('transactions')
  list(@CurrentActor() actor: Actor, @Query('from') from?: string, @Query('to') to?: string) {
    const date = /^\d{4}-\d{2}-\d{2}$/

    if ((from && !date.test(from)) || (to && !date.test(to))) {
      throw new BadRequestException({ error: 'Invalid dates' })
    }

    return this.stored.list(actor, from, to)
  }

  @Delete('transactions')
  deleteAll(@CurrentActor() actor: Actor) {
    return this.stored.deleteAll(actor)
  }
}
