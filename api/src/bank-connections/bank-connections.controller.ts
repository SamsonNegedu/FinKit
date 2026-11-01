import {
  HttpCode,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import type { Response } from 'express'
import { AccessGuard, CurrentActor } from '../access/access.guard'
import { Actor } from '../access/access.settings'
import { CsrfGuard } from '../access/csrf.guard'
import { NoStoreInterceptor } from '../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe'
import { BankConnectionsService } from './bank-connections.service'
import { ConnectInput, ConnectSchema, SyncInput, SyncSchema } from './bank-connections.schemas'
import { BadRequestException } from '@nestjs/common'

export const STATE_COOKIE = 'finkit_bank_state'

/** What a signed-in user does with their bank connections. */
@Controller('api/banking')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class BankConnectionsController {
  constructor(private readonly connections: BankConnectionsService) {}

  @Get('status')
  status(@CurrentActor() actor: Actor) {
    return this.connections.status(actor)
  }

  @Get('banks')
  async banks(@Query('country') country = 'DE') {
    const code = country.toUpperCase()
    if (!/^[A-Z]{2}$/.test(code)) throw new BadRequestException({ error: 'Invalid country' })
    return { banks: await this.connections.banks(code) }
  }

  @Post('connect')
  @HttpCode(200) // the previous API answered 200, not 201
  async connect(
    @CurrentActor() actor: Actor,
    @Body(new ZodValidationPipe(ConnectSchema, { message: 'Invalid request' })) body: ConnectInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { url, state } = await this.connections.startConnection(actor, body)
    // Ties the bank's return to this browser: the callback must present the same value
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.connections.config.isProd,
      path: '/api/banking',
      maxAge: 600_000,
    })
    return { url }
  }

  @Get('connections')
  list() {
    return { connections: this.connections.list() }
  }

  @Post('connections/:id/sync')
  @HttpCode(200) // the previous API answered 200, not 201
  sync(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SyncSchema, { message: 'Invalid dates' })) body: SyncInput,
  ) {
    return this.connections.sync(actor, id, body ?? {})
  }

  @Delete('connections/:id')
  disconnect(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.connections.disconnect(actor, id)
  }
}
