import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ForbiddenException,
  Optional,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common'
import type { Request } from 'express'
import { UsersService } from '../users/users.service'
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
    @Optional()
    @Inject(ACCESS_VERIFIER)
    private readonly verify: AccessVerifier | null,
    private readonly users: UsersService,
    @Optional()
    @Inject(ACCESS_REFUSED)
    private readonly onRefused?: AccessRefusedHandler,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ActorRequest>()

    if (this.settings.mode === 'dev') {
      // No Cloudflare in front: the developer is dev@localhost. X-Dev-User lets you try a second person locally.
      const email = (!this.settings.isProd && req.header('x-dev-user')) || 'dev@localhost'

      return this.identify(req, email)
    }
    const token = req.header('cf-access-jwt-assertion')

    if (!token || !this.verify) {
      return this.refuse(req, 'no token')
    }
    let email: string

    try {
      email = (await this.verify(token)).email
    } catch {
      return this.refuse(req, 'invalid token')
    }

    return this.identify(req, email)
  }

  private identify(req: ActorRequest, email: string): boolean {
    const user = this.users.ensure(email)

    if (!user) {
      this.onRefused?.(req.path, 'user not allowed')
      throw new ForbiddenException({ error: 'Forbidden' })
    }
    req.actor = { email: user.email, userId: user.id }

    return true
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
