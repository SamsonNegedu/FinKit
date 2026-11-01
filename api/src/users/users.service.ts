import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ACCESS_SETTINGS, AccessSettings } from '../access/access.settings'
import { UsersRepository } from './users.repository'

export interface User {
  id: string
  email: string
}

/** Hands data that predates user accounts to the person who should inherit it. */
type LegacyClaimer = (userId: string) => void

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly claimers: LegacyClaimer[] = []
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly users: UsersRepository,
    @Inject(ACCESS_SETTINGS) private readonly settings: AccessSettings,
  ) {}

  onModuleInit() {
    if (this.settings.allowedEmails.length === 0) {
      this.logger.error('No one is allowed in: set ALLOWED_USER_EMAILS. Every request will be refused.')
    }
  }

  /** Stores register how to adopt their old, ownerless rows. They run once, when that person's profile is created. */
  onLegacyOwnerCreated(claim: LegacyClaimer) {
    this.claimers.push(claim)
  }

  /**
   * The user for a signed-in email, or null when that email is not on the allowed list.
   * The list is checked on every request, so taking someone off it locks them out at once.
   * Everyone on it is equal. Data from before accounts goes to the first address listed.
   */
  ensure(rawEmail: string): User | null {
    const email = rawEmail.trim().toLowerCase()

    if (!this.settings.allowedEmails.includes(email)) {
      return null
    }
    const existing = this.users.findByEmail(email)

    if (existing) {
      this.users.touch(existing.id)

      return { id: existing.id, email }
    }
    const created = this.users.create(email)

    if (email === this.settings.legacyOwner) {
      for (const claim of this.claimers) {
        claim(created.id)
      }
    }

    return { id: created.id, email }
  }
}
