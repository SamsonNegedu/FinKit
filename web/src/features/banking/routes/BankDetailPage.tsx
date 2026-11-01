import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import ConnectionActions from '../components/banks/ConnectionActions'
import StatusPill from '../components/banks/StatusPill'
import { useConnectionActions } from '../components/banks/useConnectionActions'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { timeAgo } from '@/features/banking/api/banking.api'
import { useBankingStatus, useConnections } from '@/features/banking/hooks/banking-queries'
import { formatCurrency } from '@/shared/utils/format'

/** One bank: its accounts, how much each has brought in, and how to sync or disconnect. */
export default function BankDetailPage() {
  const app = useApp()
  const navigate = useNavigate()
  const { connectionId } = useParams({ from: '/banks/$connectionId' })
  const { data: status } = useBankingStatus()
  const { data: connections, isLoading } = useConnections()
  const actions = useConnectionActions()
  const c = connections?.find(x => x.id === connectionId)

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    )
  if (!c) {
    return (
      <div className="card text-center py-10 space-y-3">
        <p className="text-white font-medium">That bank isn't connected.</p>
        <Link to="/banks" className="btn-secondary inline-block">
          All banks
        </Link>
      </div>
    )
  }

  const mine = app.displayTransactions.filter(t => t.bankName === c.bank)
  return (
    <div className="space-y-6">
      <PageHeader
        title={c.bank}
        description={`Last sync ${timeAgo(c.lastSyncAt)} · ${mine.length} transactions in FinKit`}
        actions={<StatusPill connection={c} />}
      />
      <div className="card">
        <ConnectionActions
          connection={c}
          actions={actions}
          mock={!!status?.mock}
          onDisconnected={() => navigate({ to: '/banks' })}
        />
      </div>
      <section className="card" aria-label="Accounts">
        <h2 className="text-lg font-semibold text-white mb-3">Accounts</h2>
        <ul className="divide-y divide-midnight-800">
          {c.accounts.map(a => {
            const rows = mine.filter(t => t.accountLabel === a.label)
            const net = rows.reduce((s, t) => s + (t.isExcluded ? 0 : t.type === 'income' ? t.amount : -t.amount), 0)
            return (
              <li key={a.id}>
                <Link
                  to="/transactions"
                  search={{ bank: c.bank, account: rows[0]?.accountRef }}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-midnight-800/40 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-white truncate">{a.label}</p>
                    <p className="text-xs text-midnight-400">
                      {a.currency ?? ''} · {rows.length} transactions
                    </p>
                  </div>
                  <span className={`tabular-nums text-sm ${net >= 0 ? 'text-income' : 'text-expense'}`}>
                    {formatCurrency(net, app.baseCurrency)}
                  </span>
                </Link>
              </li>
            )
          })}
          {c.accounts.length === 0 && <li className="py-4 text-sm text-midnight-400">No accounts shared.</li>}
        </ul>
      </section>
    </div>
  )
}
