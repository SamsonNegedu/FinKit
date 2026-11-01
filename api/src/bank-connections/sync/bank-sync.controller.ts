import { Body, Controller, HttpCode, Inject, Param, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common'
import type { Request } from 'express'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { ACCESS_SETTINGS, AccessSettings, Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { SyncInput, SyncSchema } from '../connections/bank-connections.schemas'
import { psuFromRequest } from './psu'
import { BankSyncService } from './bank-sync.service'

/** Pressing Sync: fetch now, keep what is new, and return what the bank sent. */
@Controller('api/banking')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class BankSyncController {
  constructor(
    private readonly syncs: BankSyncService,
    @Inject(ACCESS_SETTINGS) private readonly access: AccessSettings,
  ) {}

  @Post('connections/:id/sync')
  @HttpCode(200) // the previous API answered 200, not 201
  sync(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SyncSchema, { message: 'Invalid dates' }))
    body: SyncInput,
    @Req() req: Request,
  ) {
    return this.syncs.sync(actor, id, body ?? {}, psuFromRequest(req, this.access.mode === 'cloudflare'))
  }
}
