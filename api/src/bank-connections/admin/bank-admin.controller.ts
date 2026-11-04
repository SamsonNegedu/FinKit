import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { BankConnectionsService } from '../connections/bank-connections.service'
import { AdminLimitQuerySchema } from './bank-admin.schemas'

/** Back office: is it set up correctly, and what ran and what you did. Everyone sees only their own activity. */
@Controller('api/banking/admin')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class BankAdminController {
  constructor(private readonly connections: BankConnectionsService) {}

  @Get('overview') overview(@CurrentActor() actor: Actor) {
    return this.connections.overview(actor)
  }

  @Get('sync-log')
  syncLog(
    @CurrentActor() actor: Actor,
    @Query(new ZodValidationPipe(AdminLimitQuerySchema, { message: 'Invalid limit' })) query: { limit?: number },
  ) {
    return this.connections.syncLog(actor, query.limit ?? 100)
  }

  @Get('audit')
  audit(
    @CurrentActor() actor: Actor,
    @Query(new ZodValidationPipe(AdminLimitQuerySchema, { message: 'Invalid limit' })) query: { limit?: number },
  ) {
    return this.connections.auditLog(actor, query.limit ?? 100)
  }
}
