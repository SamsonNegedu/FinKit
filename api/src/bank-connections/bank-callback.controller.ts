import { Controller, Get, Query, Req, Res, UseInterceptors } from '@nestjs/common'
import type { Request, Response } from 'express'
import { NoStoreInterceptor } from '../shared/http/no-store.interceptor'
import { BankConnectionsService } from './bank-connections.service'
import { STATE_COOKIE } from './bank-connections.controller'

function cookieValue(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

/**
 * Where the bank sends the user back. This is the only public banking route: it is protected by a
 * single-use request we started plus a cookie from the same browser, not by sign-in.
 */
@Controller('api/banking')
@UseInterceptors(NoStoreInterceptor)
export class BankCallbackController {
  constructor(private readonly connections: BankConnectionsService) {}

  @Get('callback')
  async callback(
    @Query('state') state: string,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cookieState = cookieValue(req, STATE_COOKIE)
    res.clearCookie(STATE_COOKIE, { path: '/api/banking' })
    const outcome = await this.connections.completeConnection({
      state,
      code,
      error,
      cookieState,
    })
    return res.redirect(302, BankConnectionsService.returnUrl(outcome))
  }
}
