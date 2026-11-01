import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { timeAgo } from '../../lib/banking'
import {
  errorMessage,
  useAdminAudit,
  useAdminOverview,
  useAdminSyncLog,
  useBankingStatus,
} from '../../lib/banking-queries'

type BackOfficeSection = 'overview' | 'sync-log' | 'audit'

const SECTIONS: Array<{ id: BackOfficeSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'sync-log', label: 'Sync log' },
  { id: 'audit', label: 'Audit' },
]

/** Back office for the operator: is it set up correctly, what ran, who did what. */
export default function BackOfficePanel({ section }: { section: BackOfficeSection }) {
  const { data: status } = useBankingStatus()
  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-midnight-700" role="tablist">
        {SECTIONS.map(s => (
          <Link
            key={s.id}
            to="/settings/back-office"
            search={{ section: s.id === 'overview' ? undefined : s.id }}
            role="tab"
            aria-selected={section === s.id}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${section === s.id ? 'border-accent text-white' : 'border-transparent text-midnight-400 hover:text-midnight-200'}`}
          >
            {s.label}
          </Link>
        ))}
      </div>
      {section === 'overview' && <Overview mock={!!status?.mock} />}
      {section === 'sync-log' && <SyncLog />}
      {section === 'audit' && <Audit />}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-accent" />
    </div>
  )
}

function Overview({ mock }: { mock: boolean }) {
  const { data, isLoading, error } = useAdminOverview()
  if (isLoading) return <Loading />
  if (!data) return <p className="text-sm text-red-300">{errorMessage(error, "Couldn't load.")}</p>
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          title="Connections"
          value={String(data.connections.total)}
          sub={`${data.connections.active} active · ${data.connections.expiring} expiring · ${data.connections.expired} expired`}
        />
        <Stat
          title="Syncs, last 30 days"
          value={String(data.syncs30d.total)}
          sub={`${data.syncs30d.ok} ok · ${data.syncs30d.failed} failed`}
        />
        <Stat
          title="Last successful sync"
          value={data.lastSuccessfulSync ? timeAgo(data.lastSuccessfulSync.at) : 'Never'}
          sub={data.lastSuccessfulSync?.bank ?? ''}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Setup checks</p>
        {data.checks.map(c => (
          <div key={c.id} className="flex items-center gap-3 text-sm bg-midnight-800/50 rounded-lg px-3 py-2">
            <span
              className={`w-5 h-5 rounded-full grid place-items-center text-xs font-bold shrink-0 ${c.ok && !c.warn ? 'bg-income/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}
            >
              {c.ok && !c.warn ? '✓' : '!'}
            </span>
            <span className="text-midnight-100">{c.label}</span>
            <span className="ml-auto text-xs font-mono text-midnight-400 text-right break-all">{c.detail}</span>
          </div>
        ))}
      </div>
      {mock && (
        <p className="text-xs text-midnight-500">You are using the test bank. Nothing here touches a real account.</p>
      )}
    </div>
  )
}

function Table({ heads, children, empty }: { heads: string[]; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-midnight-400 border-b border-midnight-700">
            {heads.map(h => (
              <th key={h} className="py-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={heads.length} className="py-6 text-center text-midnight-400">
                Nothing yet.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

function SyncLog() {
  const { data, isLoading, error } = useAdminSyncLog()
  if (isLoading) return <Loading />
  if (!data) return <p className="text-sm text-red-300">{errorMessage(error, "Couldn't load.")}</p>
  return (
    <Table heads={['When', 'Bank', 'Range', 'Fetched', 'Result']} empty={data.length === 0}>
      {data.map((r, i) => (
        <tr key={i} className="border-b border-midnight-800">
          <td className="py-2 pr-4 whitespace-nowrap text-midnight-300">{timeAgo(String(r.started_at))}</td>
          <td className="py-2 pr-4">{r.bank ?? '—'}</td>
          <td className="py-2 pr-4 whitespace-nowrap text-midnight-300">
            {r.date_from} → {r.date_to}
          </td>
          <td className="py-2 pr-4 tabular-nums">{r.fetched}</td>
          <td className="py-2 pr-4">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'ok' ? 'bg-income/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}
            >
              {r.status}
            </span>
            {r.error ? <span className="text-xs text-midnight-400 ml-2">{r.error}</span> : null}
          </td>
        </tr>
      ))}
    </Table>
  )
}

function Audit() {
  const { data, isLoading, error } = useAdminAudit()
  if (isLoading) return <Loading />
  if (!data) return <p className="text-sm text-red-300">{errorMessage(error, "Couldn't load.")}</p>
  return (
    <Table heads={['When', 'Who', 'Action', 'Detail']} empty={data.length === 0}>
      {data.map((r, i) => {
        const bad = String(r.action).includes('refused') || String(r.action).includes('failed')
        return (
          <tr key={i} className="border-b border-midnight-800">
            <td className="py-2 pr-4 whitespace-nowrap text-midnight-300">{timeAgo(String(r.ts))}</td>
            <td className="py-2 pr-4">{r.actor}</td>
            <td className="py-2 pr-4">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${bad ? 'bg-red-500/15 text-red-300' : 'bg-blue-500/15 text-blue-300'}`}
              >
                {r.action}
              </span>
            </td>
            <td className="py-2 pr-4 text-midnight-400 text-xs">{[r.target, r.detail].filter(Boolean).join(' · ')}</td>
          </tr>
        )
      })}
    </Table>
  )
}

function Stat({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="border border-midnight-700 rounded-xl p-3 bg-midnight-800/40">
      <p className="text-xs text-midnight-400">{title}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="text-xs text-midnight-400">{sub}</p>
    </div>
  )
}
