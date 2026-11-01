import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { ActorRequest } from './access.guard'

/** Only the listed admin emails get through. Use after AccessGuard. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!context.switchToHttp().getRequest<ActorRequest>().actor?.admin)
      throw new ForbiddenException({ error: 'Forbidden' })
    return true
  }
}
