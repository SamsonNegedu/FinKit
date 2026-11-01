import { BankConnection } from '@/features/banking/api/banking.api'

// Shown above the dashboard when a bank connection is about to expire or already has
export default function BankBanners({
  connections,
  onReconnect,
}: {
  connections: BankConnection[]
  onReconnect: (c: BankConnection) => void
}) {
  const items = connections.filter(c => c.status !== 'active')
  if (items.length === 0) return null
  return (
    <div className="space-y-2 mb-6">
      {items.map(c => {
        const expired = c.status === 'expired'
        return (
          <div
            key={c.id}
            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm border ${expired ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}
            role="status"
          >
            <span>
              <b>{c.bank}</b>
              {expired
                ? " access has ended. New transactions won't sync until you reconnect."
                : ` access ends in ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}. Reconnect to keep syncing.`}
            </span>
            <button
              onClick={() => onReconnect(c)}
              className={`text-sm px-3 py-1.5 rounded-lg border ${expired ? 'bg-midnight-800 border-midnight-600 text-white' : 'bg-amber-500/15 border-amber-500/40'}`}
            >
              Reconnect {c.bank}
            </button>
          </div>
        )
      })}
    </div>
  )
}
