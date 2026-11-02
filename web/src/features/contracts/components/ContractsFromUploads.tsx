import { formatCurrency } from '@/shared/utils/format'
import type { UploadCandidate } from '../utils/uploadCandidates'

const EVERY = { monthly: 'month', quarterly: 'quarter', yearly: 'year' } as const

/** Recurring payments found in uploaded files. Adding one sends only its name, amount and rhythm. */
export default function ContractsFromUploads({
  candidates,
  busy,
  onAdd,
}: {
  candidates: UploadCandidate[]
  busy: boolean
  onAdd: (c: UploadCandidate) => void
}) {
  if (candidates.length === 0) {
    return null
  }

  return (
    <section className="card !p-4">
      <h2 className="text-xs uppercase tracking-wide text-midnight-500">Found in your uploaded files</h2>
      <p className="mt-1 text-xs text-midnight-400">
        These files stay in your browser. Adding one saves only its name, amount and how often it is paid.
      </p>
      <ul className="mt-2 divide-y divide-midnight-800">
        {candidates.map(c => (
          <li key={c.key} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{c.name}</span>
              <span className="block text-xs text-midnight-400">
                {c.count} payments · {c.category}
              </span>
            </span>
            <span className="whitespace-nowrap text-sm tabular-nums text-white">
              {formatCurrency(c.amount, c.currency)}
              <span className="text-xs text-midnight-400"> / {EVERY[c.frequency]}</span>
            </span>
            <button className="btn-secondary !px-3 !py-1 text-sm" disabled={busy} onClick={() => onAdd(c)}>
              Add
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
