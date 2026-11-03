import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { merchantKeyOf, sameMerchant } from '@/shared/utils/categorizer'
import { displayNameOf } from '@/shared/utils/aliases'
import { useConnections } from '@/features/banking/hooks/banking-queries'
import { useTrips } from '@/features/trips/hooks/trips-queries'
import { useApp } from '@/shared/contexts/AppState'

interface Crumb {
  label: string
  to?: string
  search?: Record<string, unknown>
  params?: Record<string, string>
}

const SETTINGS_LABEL: Record<string, string> = {
  sheet: 'Google Sheet',
  columns: 'Columns',
  rules: 'Learned rules',
  'back-office': 'Back office',
}

/** Where you are in the hierarchy: Banks › N26, Transactions › Merchants › DeepSeek. Every part is a link up. */
export default function Breadcrumbs() {
  const pathname = useRouterState({ select: s => s.location.pathname }).replace(/^\/app/, '') || '/'
  const { displayTransactions } = useApp()
  const { data: connections = [] } = useConnections()
  const { data: trips = [] } = useTrips(pathname.startsWith('/trips'))
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent)

  const crumbs: Crumb[] = []
  const [first, second, third] = parts

  if (!first) {
    crumbs.push({ label: 'Overview' })
  } else if (first === 'banks') {
    crumbs.push({ label: 'Banks', to: '/banks' })
    if (second === 'connect') {
      crumbs.push({ label: 'Connect a bank' })
    } else if (second) {
      const c = connections.find(x => x.id === second)

      crumbs.push({ label: c?.bank ?? 'Bank' })
    }
  } else if (first === 'transactions') {
    crumbs.push({ label: 'Transactions', to: '/transactions' })
    if (second === 'merchants' && third) {
      const sample = displayTransactions.find(t => sameMerchant(merchantKeyOf(t), third))

      crumbs.push({ label: 'Merchants', to: '/transactions', search: { view: 'merchants' } })
      crumbs.push({ label: sample ? displayNameOf(sample) : third })
    }
  } else if (first === 'trips') {
    crumbs.push({ label: 'Trips', to: second ? '/trips' : undefined })
    if (second) {
      crumbs.push({ label: trips.find(t => t.id === second)?.name ?? 'Trip' })
    }
  } else if (first === 'analytics') {
    crumbs.push({ label: 'Analytics', to: second ? '/analytics' : undefined })
    if (second === 'trends') {
      crumbs.push({ label: 'Trends' })
    }
  } else if (first === 'settings') {
    crumbs.push({ label: 'Settings', to: '/settings' })
    if (second) {
      crumbs.push({ label: SETTINGS_LABEL[second] ?? second })
    }
  } else {
    crumbs.push({
      label:
        { review: 'Review', income: 'Income', export: 'Export', contracts: 'Recurring payments', budgets: 'Budgets' }[
          first
        ] ?? first,
    })
  }

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm min-w-0">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-midnight-600 shrink-0" aria-hidden="true" />}
            {c.to && i < crumbs.length - 1 ? (
              <Link to={c.to} search={c.search as never} className="text-midnight-400 hover:text-white truncate">
                {c.label}
              </Link>
            ) : (
              <span
                className="text-white font-medium truncate"
                aria-current={i === crumbs.length - 1 ? 'page' : undefined}
              >
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
