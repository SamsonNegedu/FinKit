import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common'
import type { Request } from 'express'
import { ACCESS_SETTINGS, ACCESS_VERIFIER, AccessSettings, AccessVerifier, Actor } from './access.settings'

export type ActorRequest = Request & { actor?: Actor }

/** Callback for features that want to record refused requests (the bank audit log does). */
export const ACCESS_REFUSED = Symbol('ACCESS_REFUSED')
type AccessRefusedHandler = (path: string, reason: string) => void

/** Only signed-in users get through. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_SETTINGS) private readonly settings: AccessSettings,
    @Optional() @Inject(ACCESS_VERIFIER) private readonly verify: AccessVerifier | null,
    @Optional() @Inject(ACCESS_REFUSED) private readonly onRefused?: AccessRefusedHandler,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ActorRequest>()
    if (this.settings.mode === 'dev') {
      req.actor = { email: 'dev@localhost', admin: true }
      return true
    }
    const token = req.header('cf-access-jwt-assertion')
    if (!token || !this.verify) return this.refuse(req, 'no token')
    try {
      const { email } = await this.verify(token)
      req.actor = { email, admin: this.settings.adminEmails.includes(email) }
      return true
    } catch {
      return this.refuse(req, 'invalid token')
    }
  }

  private refuse(req: Request, reason: string): never {
    this.onRefused?.(req.path, reason)
    throw new UnauthorizedException({ error: 'Unauthorized' })
  }
}

/** The signed-in user (set by AccessGuard). */
export const CurrentActor = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Actor => ctx.switchToHttp().getRequest<ActorRequest>().actor!,
)
