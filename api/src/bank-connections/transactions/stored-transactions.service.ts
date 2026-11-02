import { Injectable } from '@nestjs/common'
import { Actor } from '../../access/access.settings'
import { BankConnectionsStore } from '../connections/bank-connections.store'
import { BankTransactionsStore } from '../../transactions/bank-transactions.store'
import { TransactionHooks } from '../../transactions/transaction-hooks'

/** What the server has kept for a person: reading it and erasing it. Always limited to that person. */
@Injectable()
export class StoredTransactionsService {
  constructor(
    private readonly store: BankConnectionsStore,
    private readonly txs: BankTransactionsStore,
    private readonly hooks: TransactionHooks,
  ) {}

  /**
   * What has been stored for this person, optionally within a date range. Each transaction carries
   * its ref (how it is added to a trip) and the trip it is in, if any. The app hides trip
   * transactions from the months itself, because it also holds copies from earlier syncs.
   */
  list(actor: Actor, from?: string, to?: string) {
    // What trips (or any feature built on these) add to each transaction, such as the trip it is in
    const extra = this.hooks.decorationsFor(actor.userId)
    const transactions = this.txs.listWithRefs(actor.userId, from, to).map(r => ({
      ...r.tx,
      ref: r.ref,
      ...extra(r.ref),
    }))

    return { transactions, count: transactions.length }
  }

  /** Removes this person's stored transactions (their connections stay). */
  deleteAll(actor: Actor) {
    const deleted = this.txs.deleteAll(actor.userId)

    this.hooks.erased(actor.userId)

    this.store.audit(actor.email, 'transactions.delete', undefined, { deleted }, actor.userId)

    return { deleted }
  }
}
