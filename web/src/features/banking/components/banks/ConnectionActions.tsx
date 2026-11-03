import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { BankConnection } from '@/features/banking/api/banking.api'
import FetchPeriod from './FetchPeriod'
import { useConnectionActions } from './useConnectionActions'

type Actions = ReturnType<typeof useConnectionActions>

interface Props {
  connection: BankConnection
  actions: Actions
  mock: boolean
  onDisconnected?: () => void
}

/** Sync, reconnect and disconnect for one connection. The same buttons everywhere it's shown. */
export default function ConnectionActions({ connection: c, actions, mock, onDisconnected }: Props) {
  const [showFrom, setShowFrom] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const working = actions.syncingId === c.id || actions.busyId === c.id

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 max-sm:[&>button]:flex-1">
        {c.status === 'expired' ? (
          <button onClick={() => actions.reconnect(c)} className="btn-primary text-sm">
            Reconnect
          </button>
        ) : (
          <>
            <button
              onClick={() => actions.sync(c)}
              disabled={working}
              className="btn-primary text-sm flex items-center justify-center gap-2"
            >
              {actions.syncingId === c.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Sync now
                </>
              )}
            </button>
            <button
              onClick={() => setShowFrom(v => !v)}
              disabled={working}
              className="btn-secondary text-sm"
              aria-expanded={showFrom}
            >
              Fetch a period…
            </button>
            {c.status === 'expiring' && (
              <button
                onClick={() => actions.reconnect(c)}
                className="text-sm px-3 py-2 rounded-lg bg-warning/15 text-warning border border-warning/30"
              >
                Reconnect
              </button>
            )}
          </>
        )}

        <span className="ml-auto flex items-center gap-3 max-sm:w-full max-sm:justify-end">
          {mock && (
            <>
              <button
                onClick={() => actions.age(c, 'expiring')}
                className="text-xs text-midnight-500 hover:text-midnight-200 underline"
              >
                test: expiring
              </button>
              <button
                onClick={() => actions.age(c, 'expired')}
                className="text-xs text-midnight-500 hover:text-midnight-200 underline"
              >
                test: expired
              </button>
            </>
          )}
          {confirming ? (
            <>
              <button
                onClick={async () => {
                  setConfirming(false)
                  if (await actions.disconnect(c)) {
                    onDisconnected?.()
                  }
                }}
                className="text-sm px-3 py-1.5 rounded-lg bg-negative/20 text-negative border border-negative/40"
              >
                Yes, disconnect
              </button>
              <button onClick={() => setConfirming(false)} className="text-sm text-midnight-400 hover:text-ink">
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={working}
              className="text-sm text-negative/80 hover:text-negative"
            >
              {c.status === 'expired' ? 'Remove' : 'Disconnect'}
            </button>
          )}
        </span>
      </div>

      {showFrom && (
        <FetchPeriod
          disabled={working}
          onCancel={() => setShowFrom(false)}
          onFetch={(from, to) => {
            setShowFrom(false)
            actions.sync(c, from, to)
          }}
        />
      )}
    </div>
  )
}
