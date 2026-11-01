import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowRight } from 'lucide-react'
import CurrencyRates from '../components/CurrencyRates'
import FileUpload from '../components/FileUpload'
import { needsReview } from '../components/ReviewQueue'
import DashboardSkeleton from '../components/Skeleton'
import SummaryCards from '../components/SummaryCards'
import CategoryChart from '../components/charts/CategoryChart'
import { useApp } from '../app/AppState'
import PageHeader from '../app/PageHeader'
import { displayNameOf } from '../lib/aliases'
import { getCategoryColor } from '../lib/categorizer'
import { formatCurrency } from '../lib/format'
import { formatDay } from '../lib/dates'
import { useBankingStatus, useConnections } from '../lib/banking-queries'
import { inPeriod, summarize } from '../lib/summary'

export default function OverviewPage() {
  const app = useApp()
  const navigate = useNavigate()
  const { data: banking } = useBankingStatus()
  const { data: connections = [] } = useConnections()

  if (app.isRestoring) return <DashboardSkeleton />

  // Nothing yet: connect a bank first, with file import as the fallback
  if (app.transactions.length === 0) {
    return (
      <FileUpload
        onFileUpload={app.uploadFile}
        isLoading={app.isLoading}
        error={app.error}
        bankingEnabled={!!banking?.enabled}
        onConnectBank={bank => navigate({ to: '/banks/connect', search: bank ? { bank } : {} })}
      />
    )
  }

  const period = inPeriod(app.displayTransactions, app.dateRange)
  const summary = summarize(period, app.dateRange, app.baseCurrency)
  const toReview = period.filter(t => t.category !== 'Transfer' && needsReview(t)).length
  const latest = period.filter(t => t.category !== 'Transfer').slice(0, 8)
  const attention = connections.filter(c => c.status !== 'active')
  const hasAttention = toReview > 0 || attention.length > 0

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Your month at a glance." />
      <CurrencyRates
        base={app.baseCurrency}
        foreign={app.foreignCurrencies}
        rates={app.rates}
        onChange={app.onRatesChange}
      />
      <SummaryCards summary={summary} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CategoryChart
          categorySummary={summary.categorySummary}
          currency={summary.currency}
          onSelectCategory={category => navigate({ to: '/transactions', search: { cat: [category] } })}
        />

        <div className="space-y-6">
          {hasAttention && (
            <section className="card space-y-3" aria-label="Needs attention">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" /> Needs attention
              </h2>
              <ul className="space-y-2 text-sm">
                {toReview > 0 && (
                  <li>
                    <Link
                      to="/review"
                      className="flex items-center justify-between rounded-lg bg-midnight-800/60 hover:bg-midnight-800 px-3 py-2"
                    >
                      <span className="text-midnight-100">
                        {toReview} transaction{toReview === 1 ? '' : 's'} need a category
                      </span>
                      <ArrowRight className="w-4 h-4 text-midnight-400" />
                    </Link>
                  </li>
                )}
                {attention.map(c => (
                  <li key={c.id}>
                    <Link
                      to="/banks/$connectionId"
                      params={{ connectionId: c.id }}
                      className="flex items-center justify-between rounded-lg bg-midnight-800/60 hover:bg-midnight-800 px-3 py-2"
                    >
                      <span className="text-midnight-100">
                        {c.bank}: {c.status === 'expired' ? 'access has ended' : `access ends in ${c.daysLeft} days`}
                      </span>
                      <ArrowRight className="w-4 h-4 text-midnight-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card" aria-label="Latest transactions">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Latest transactions</h2>
              <Link to="/transactions" className="text-sm text-accent hover:underline">
                View all →
              </Link>
            </div>
            <ul className="divide-y divide-midnight-800">
              {latest.map(t => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="text-midnight-400 w-14 shrink-0">{formatDay(t.date)}</span>
                  <span className="flex-1 min-w-0 truncate text-white">{displayNameOf(t)}</span>
                  <span className="hidden sm:flex items-center gap-1.5 text-xs text-midnight-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(t.category) }} />
                    {t.category || 'Other'}
                  </span>
                  <span className={`tabular-nums font-medium ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatCurrency(t.amount, app.baseCurrency)}
                  </span>
                </li>
              ))}
              {latest.length === 0 && <li className="py-6 text-center text-midnight-400">Nothing in this period.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
