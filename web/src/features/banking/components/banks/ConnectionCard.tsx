import { Link } from '@tanstack/react-router'
import { useApp } from '@/shared/contexts/AppState'
import { BankConnection, timeAgo } from '@/features/banking/api/banking.api'
import ConnectionActions from './ConnectionActions'
import StatusPill from './StatusPill'
import { useConnectionActions } from './useConnectionActions'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function ConnectionCard({
  connection: c,
  actions,
  mock,
}: {
  connection: BankConnection
  actions: ReturnType<typeof useConnectionActions>
  mock: boolean
}) {
  const { transactions } = useApp()
  const count = transactions.filter(t => t.bankName === c.bank).length
  const consentDays = 180
  const left = Math.max(0, Math.min(consentDays, c.daysLeft))

  return (
    <div className="border border-midnight-700 rounded-xl p-4 bg-midnight-900 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/banks/$connectionId"
          params={{ connectionId: c.id }}
          className="flex items-center gap-3 min-w-0 group"
        >
          <div className="w-10 h-10 rounded-lg bg-midnight-700 border border-midnight-600 grid place-items-center font-bold text-midnight-100 shrink-0">
            {c.bank[0]}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-white truncate group-hover:underline">{c.bank}</p>
            <p className="text-xs text-midnight-400">{c.country === 'DE' ? 'Germany' : c.country} · personal</p>
          </div>
        </Link>
        <StatusPill connection={c} />
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <dt className="text-xs text-midnight-400">In FinKit</dt>
          <dd className="text-midnight-100">{count.toLocaleString()} transactions</dd>
        </div>
        <div>
          <dt className="text-xs text-midnight-400">Accounts</dt>
          <dd className="text-midnight-100">
            {c.accounts.map(a => `${a.label}${a.currency ? ' · ' + a.currency : ''}`).join(', ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-midnight-400">{c.status === 'expired' ? 'Access ended' : 'Access until'}</dt>
          <dd className="text-midnight-100">{fmtDate(c.validUntil)}</dd>
        </div>
        <div>
          <dt className="text-xs text-midnight-400">Last sync</dt>
          <dd className="text-midnight-100">{timeAgo(c.lastSyncAt)}</dd>
        </div>
      </dl>

      {c.status !== 'expired' && (
        <div>
          <div className="h-1 rounded-full bg-midnight-800 overflow-hidden" aria-hidden>
            <div
              className={`h-full ${c.status === 'expiring' ? 'bg-amber-400' : 'bg-accent'}`}
              style={{ width: `${(left / consentDays) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-midnight-500 mt-1">{c.daysLeft} days of access left</p>
        </div>
      )}

      {c.reconnectSuggested && c.status !== 'expired' && (
        <p className="text-xs text-midnight-300 bg-midnight-800/60 rounded-lg px-3 py-2">
          Reconnect this bank so FinKit can spot transfers between your own accounts.{' '}
          <button onClick={() => actions.reconnect(c)} className="text-accent hover:underline">
            Reconnect
          </button>
        </p>
      )}

      <ConnectionActions connection={c} actions={actions} mock={mock} />
    </div>
  )
}
