import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common'
import { AccessGuard } from '../access/access.guard'
import { AdminGuard } from '../access/admin.guard'
import { CsrfGuard } from '../access/csrf.guard'
import { NoStoreInterceptor } from '../shared/http/no-store.interceptor'
import { BankConnectionsService } from './bank-connections.service'

/** Back office: is it set up correctly, what ran, who did what. Admin emails only. */
@Controller('api/banking/admin')
@UseGuards(AccessGuard, AdminGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class BankAdminController {
  constructor(private readonly connections: BankConnectionsService) {}

  @Get('overview') overview() {
    return this.connections.overview()
  }
  @Get('sync-log') syncLog(@Query('limit') limit?: string) {
    return this.connections.syncLog(Number(limit))
  }
  @Get('audit') audit(@Query('limit') limit?: string) {
    return this.connections.auditLog(Number(limit))
  }
}
