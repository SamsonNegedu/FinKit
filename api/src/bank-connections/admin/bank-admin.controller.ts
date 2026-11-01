import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { BankConnectionsService } from '../connections/bank-connections.service'

/** Back office: is it set up correctly, and what ran and what you did. Everyone sees only their own activity. */
@Controller('api/banking/admin')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class BankAdminController {
  constructor(private readonly connections: BankConnectionsService) {}

  @Get('overview') overview(@CurrentActor() actor: Actor) {
    return this.connections.overview(actor)
  }

  @Get('sync-log') syncLog(@CurrentActor() actor: Actor, @Query('limit') limit?: string) {
    return this.connections.syncLog(actor, Number(limit))
  }

  @Get('audit') audit(@CurrentActor() actor: Actor, @Query('limit') limit?: string) {
    return this.connections.auditLog(actor, Number(limit))
  }
}
