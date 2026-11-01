import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Landmark, Loader2, Plus, RefreshCw } from 'lucide-react'
import ConnectionCard from '../components/banks/ConnectionCard'
import { useConnectionActions } from '../components/banks/useConnectionActions'
import BankTile from '../components/banks/BankTile'
import { useApp } from '../app/AppState'
import PageHeader from '../app/PageHeader'
import { BanksSearch } from '../app/search'
import { useBankingStatus, useConnections } from '../lib/banking-queries'

const REASONS: Record<string, string> = {
  denied: 'You declined access at the bank.',
  expired: 'That approval took too long. Try again.',
  invalid: "That link wasn't valid. Try again.",
  failed: "Couldn't finish connecting. Try again.",
}

export default function BanksPage() {
  const app = useApp()
  const navigate = useNavigate()
  const search = useSearch({ from: '/banks' }) as BanksSearch
  const { data: status } = useBankingStatus()
  const { data: connections = [], isLoading } = useConnections()
  const actions = useConnectionActions()
  const announced = useRef<string>()

  // The bank sends people back here; say what happened, then clear it from the address
  useEffect(() => {
    // StrictMode runs effects twice in development; announce each return once
    const key = `${search.bank}${search.c ?? ''}${search.reason ?? ''}`
    if (!search.bank || announced.current === key) return
    announced.current = key
    if (search.bank === 'connected') app.pushToast({ message: 'Bank connected', tone: 'success' })
    else app.pushToast({ message: REASONS[search.reason ?? ''] ?? REASONS.failed, tone: 'error' })
    navigate({ to: '/banks', search: {}, replace: true })
    // eslint-disable-next-line
  }, [search.bank])

  return (
    <div>
      <PageHeader
        title="Banks"
        description="Connected read-only. FinKit never moves money, and transactions are kept in your browser."
        actions={
          <>
            {connections.some(c => c.status !== 'expired') && (
              <button
                onClick={async () => {
                  for (const c of connections.filter(x => x.status !== 'expired')) await actions.sync(c)
                }}
                disabled={!!actions.syncingId}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${actions.syncingId ? 'animate-spin' : ''}`} /> Sync all
              </button>
            )}
            <Link to="/banks/connect" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Connect a bank
            </Link>
          </>
        }
      />
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : connections.length === 0 ? (
        <div className="card flex flex-col items-center text-center py-12 px-6 gap-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent grid place-items-center">
            <Landmark className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h2 className="text-xl font-semibold text-white">Connect your first bank</h2>
            <p className="text-sm text-midnight-400">
              Pick your bank and approve read-only access on its own page. FinKit then keeps your transactions up to
              date.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
            {['N26', 'Wise', 'Revolut'].map(name => (
              <BankTile
                key={name}
                name={name}
                selected={false}
                onSelect={bank => navigate({ to: '/banks/connect', search: { bank } })}
              />
            ))}
          </div>
          <Link to="/banks/connect" className="text-sm text-accent hover:underline">
            Another bank…
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map(c => (
            <ConnectionCard key={c.id} connection={c} actions={actions} mock={!!status?.mock} />
          ))}
        </div>
      )}
    </div>
  )
}
