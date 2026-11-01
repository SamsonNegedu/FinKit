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
  BadRequestException,
} from '@nestjs/common'
import type { Response } from 'express'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { BankConnectionsService } from './bank-connections.service'
import { ConnectInput, ConnectSchema } from './bank-connections.schemas'
import { OAUTH_STATE_TTL_MS } from '../constants'

export const STATE_COOKIE = 'finkit_bank_state'

/** What a signed-in user does with their bank connections. */
@Controller('api/banking')
@UseGuards(AccessGuard, CsrfGuard)
@UseInterceptors(NoStoreInterceptor)
export class BankConnectionsController {
  constructor(private readonly connections: BankConnectionsService) {}

  @Get('status')
  status() {
    return this.connections.status()
  }

  @Get('banks')
  async banks(@Query('country') country = 'DE') {
    const code = country.toUpperCase()

    if (!/^[A-Z]{2}$/.test(code)) {
      throw new BadRequestException({ error: 'Invalid country' })
    }

    return { banks: await this.connections.banks(code) }
  }

  @Post('connect')
  @HttpCode(200) // the previous API answered 200, not 201
  async connect(
    @CurrentActor() actor: Actor,
    @Body(new ZodValidationPipe(ConnectSchema, { message: 'Invalid request' }))
    body: ConnectInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { url, state } = await this.connections.startConnection(actor, body)

    // Ties the bank's return to this browser: the callback must present the same value
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.connections.config.isProd,
      path: '/api/banking',
      maxAge: OAUTH_STATE_TTL_MS,
    })

    return { url }
  }

  @Get('connections')
  list(@CurrentActor() actor: Actor) {
    return { connections: this.connections.list(actor) }
  }

  @Delete('connections/:id')
  disconnect(@CurrentActor() actor: Actor, @Param('id') id: string) {
    return this.connections.disconnect(actor, id)
  }
}
