import { HttpCode, Controller, Get, Inject, Param, Post, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common'
import type { Response } from 'express'
import { AccessGuard, CurrentActor } from '../../access/access.guard'
import { Actor } from '../../access/access.settings'
import { CsrfGuard } from '../../access/csrf.guard'
import { NoStoreInterceptor } from '../../shared/http/no-store.interceptor'
import { BANK_PROVIDER } from './bank-provider'
import { BankConnectionsService } from '../connections/bank-connections.service'
import { TestBankProvider } from './test-bank.provider'

const esc = (s: string) =>
  s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

/**
 * Development only (never registered in production): a stand-in for the bank's own approval
 * page, plus a way to age a connection to see the "expiring" and "expired" states.
 */
@Controller('api/banking')
@UseInterceptors(NoStoreInterceptor)
export class TestBankController {
  constructor(
    @Inject(BANK_PROVIDER) private readonly bank: TestBankProvider,
    private readonly connections: BankConnectionsService,
  ) {}

  @Get('mock-bank')
  page(@Query('state') state = '', @Res() res: Response) {
    const req = this.bank.pendingFor(state)

    if (!req) {
      return res.status(400).send('This test request has expired. Start again from FinKit.')
    }
    const q = encodeURIComponent(state)

    return res.type('html')
      .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Test bank</title>
<style>body{font:16px/1.5 system-ui,sans-serif;background:#e9edf2;color:#1c2430;margin:0;display:grid;place-items:center;min-height:100vh;padding:16px}main{background:#f7f8fa;border-radius:12px;padding:24px;max-width:440px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,.12)}h1{font-size:19px;margin:0 0 8px}p{color:#44505f;font-size:14px}ul{background:#fff;border:1px solid #dde2e8;border-radius:10px;padding:12px 12px 12px 30px;font-size:14px}a.b{display:block;text-align:center;padding:10px;border-radius:9px;text-decoration:none;font-weight:600;margin-top:10px}a.ok{background:#1a7f5a;color:#fff}a.no{background:#fff;border:1px solid #cdd4dc;color:#1c2430}small{color:#6a7684}</style></head><body><main>
<small>TEST BANK · ${esc(req.bank.name)} · not a real bank</small><h1>Allow FinKit to read your account?</h1>
<p>This stands in for your bank's own approval page while FinKit is in development.</p>
<ul><li>Account details (name, last 4 digits)</li><li>Balances</li><li>Transactions</li><li>Cannot make payments or transfers</li></ul>
<a class="b ok" href="/api/banking/mock-bank/decide?state=${q}&d=approve">Approve</a><a class="b no" href="/api/banking/mock-bank/decide?state=${q}&d=deny">Deny</a></main></body></html>`)
  }

  @Get('mock-bank/decide')
  decide(@Query('state') state = '', @Query('d') decision: string, @Res() res: Response) {
    const target = this.bank.decide(state, decision === 'approve')

    return target ? res.redirect(302, target) : res.status(400).send('This test request has expired.')
  }

  @Post('admin/connections/:id/expire')
  @HttpCode(200) // the previous API answered 200, not 201
  @UseGuards(AccessGuard, CsrfGuard)
  expire(@CurrentActor() actor: Actor, @Param('id') id: string, @Query('mode') mode?: string) {
    return this.connections.ageConnection(actor, id, mode === 'expired' ? 'expired' : 'expiring')
  }
}
