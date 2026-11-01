import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { ACCESS_SETTINGS, AccessSettings } from './access.settings'

/**
 * Changing requests need a header a plain cross-site form or image tag can't send, and must
 * come from the allowed origin when one is configured.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(ACCESS_SETTINGS) private readonly settings: AccessSettings) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true
    if (req.header('x-finkit') !== '1') throw new ForbiddenException({ error: 'Forbidden' })
    const origin = req.header('origin')
    if (this.settings.allowedOrigin && origin && origin !== this.settings.allowedOrigin)
      throw new ForbiddenException({ error: 'Forbidden' })
    return true
  }
}
