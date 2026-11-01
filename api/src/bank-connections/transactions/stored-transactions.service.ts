import { Injectable } from '@nestjs/common'
import { Actor } from '../../access/access.settings'
import { BankConnectionsStore } from '../connections/bank-connections.store'
import { BankTransactionsStore } from './bank-transactions.store'

/** What the server has kept for a person: reading it and erasing it. Always limited to that person. */
@Injectable()
export class StoredTransactionsService {
  constructor(
    private readonly store: BankConnectionsStore,
    private readonly txs: BankTransactionsStore,
  ) {}

  /** What has been stored for this person, optionally within a date range. */
  list(actor: Actor, from?: string, to?: string) {
    const transactions = this.txs.list(actor.userId, from, to)

    return { transactions, count: transactions.length }
  }

  /** Removes this person's stored transactions (their connections stay). */
  deleteAll(actor: Actor) {
    const deleted = this.txs.deleteAll(actor.userId)

    this.store.audit(actor.email, 'transactions.delete', undefined, { deleted }, actor.userId)

    return { deleted }
  }
}
