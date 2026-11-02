import { Injectable } from '@nestjs/common'

/** Extra fields a feature adds to each stored transaction it knows about (the trip it is in), looked up by ref. */
export type Decorator = (userId: string) => (ref: string) => Record<string, unknown>

/**
 * How features that build on stored transactions (trips, contracts) take part in what happens to them,
 * without the transactions code knowing those features exist. A feature registers when it starts; the
 * transactions code only ever calls these. The same idea as `UsersService.onLegacyOwnerCreated`.
 */
@Injectable()
export class TransactionHooks {
  private readonly erasedListeners: Array<(userId: string) => void> = []
  private readonly decorators: Decorator[] = []

  /** Runs when a person's stored transactions are erased, so what was derived from them goes too. */
  onErased(listener: (userId: string) => void) {
    this.erasedListeners.push(listener)
  }

  erased(userId: string) {
    for (const listener of this.erasedListeners) {
      listener(userId)
    }
  }

  /** Adds fields to every stored transaction listed for a person. */
  decorate(decorator: Decorator) {
    this.decorators.push(decorator)
  }

  /** The combined extra fields for one person's transactions: look each one up by its ref. */
  decorationsFor(userId: string): (ref: string) => Record<string, unknown> {
    const lookups = this.decorators.map(d => d(userId))

    return ref => Object.assign({}, ...lookups.map(l => l(ref)))
  }
}
