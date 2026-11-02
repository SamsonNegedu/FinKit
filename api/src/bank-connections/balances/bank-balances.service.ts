import { Injectable } from '@nestjs/common'
import { BankConnectionsStore } from '../connections/bank-connections.store'
import { BankBalancesStore } from './bank-balances.store'

/** What each of a person's connected accounts holds, as of the last time they pressed Sync. */
@Injectable()
export class BankBalancesService {
  constructor(
    private readonly connections: BankConnectionsStore,
    private readonly balances: BankBalancesStore,
  ) {}

  list(userId: string) {
    const byConnection = new Map(this.connections.listConnections(userId).map(c => [c.id, c]))
    const out = []

    for (const b of this.balances.list(userId)) {
      const connection = byConnection.get(b.connectionId)
      const label = (JSON.parse(connection?.account_labels ?? '[]') as Array<{ id: string; label: string }>).find(
        a => a.id === b.accountRef,
      )

      // A disconnected bank's old balance is not shown
      if (connection && label) {
        out.push({
          connectionId: b.connectionId,
          bank: connection.aspsp_name,
          account: b.accountRef,
          label: label.label,
          currency: b.currency,
          amount: b.amount,
          type: b.type ?? null,
          fetchedAt: b.fetchedAt,
        })
      }
    }

    return { balances: out }
  }
}
