import { Controller, Delete, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { StoredTransactionsService } from './stored-transactions.service'
import { StoredTransactionsListQuerySchema } from './stored-transactions.schemas'

/** What the server holds for the signed-in user. */
@Controller('api/banking')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class StoredTransactionsController {
  constructor(private readonly stored: StoredTransactionsService) {}

  /** Everything stored for the signed-in user (optionally one date range). */
  @Get('transactions')
  list(
    @CurrentActor() actor: Actor,
    @Query(new ZodValidationPipe(StoredTransactionsListQuerySchema, { message: 'Invalid dates' }))
    query: { from?: string; to?: string },
  ) {
    return this.stored.list(actor, query.from, query.to)
  }

  @Delete('transactions')
  deleteAll(@CurrentActor() actor: Actor) {
    return this.stored.deleteAll(actor)
  }
}
