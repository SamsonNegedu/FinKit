import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Inbox, Landmark, Repeat, Target } from 'lucide-react'
import CurrencyRates from '@/features/settings/components/CurrencyRates'
import FileUpload from '@/features/import/components/FileUpload'
import { needsReview } from '@/features/review/components/ReviewQueue'
import DashboardSkeleton from '@/shared/components/feedback/Skeleton'
import TripsMovedNote from '@/features/trips/components/TripsMovedNote'
import CategoryIcon from '@/shared/components/CategoryIcon'
import AttentionRow from '@/features/overview/components/AttentionRow'
import AccountsCard from '@/features/overview/components/AccountsCard'
import OverviewTiles from '@/features/overview/components/OverviewTiles'
import Highlights from '@/shared/components/insights/Highlights'
import { usePeriodAnalysis } from '@/shared/components/insights/usePeriodAnalysis'
import { useDismissedInsights } from '@/shared/components/insights/useDismissedInsights'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { displayNameOf } from '@/shared/utils/aliases'
import { formatCurrency } from '@/shared/utils/format'
import { formatDay } from '@/shared/utils/dates'
import { useBalances, useBankingStatus, useConnections } from '@/features/banking/hooks/banking-queries'
import { periodLabel } from '@/shared/utils/periods'
import { useBudgets } from '@/features/budgets/hooks/budgets-queries'
import { alertLine, budgetRows } from '@/features/budgets/utils/budgetProgress'
import { useContracts } from '@/features/contracts/hooks/contracts-queries'
import { insightsOf } from '@/features/contracts/utils/contractInsights'

export default function OverviewPage() {
  const app = useApp()
  const navigate = useNavigate()
  const { data: banking } = useBankingStatus()
  const { data: connections = [] } = useConnections()
  const { data: contractData } = useContracts(!!banking?.enabled)
  const { data: budgetData } = useBudgets()
  const budgetLimits = budgetData?.budgets ?? []
  const { data: balances = [] } = useBalances(!!banking?.enabled)
  // Fixed for the visit, so "due this week" does not shift while the page is open
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [now] = useState(() => Date.now())
  const { dismissed, dismiss } = useDismissedInsights()
  const { period, analysis, highlights } = usePeriodAnalysis()

  if (app.isRestoring) {
    return <DashboardSkeleton />
  }

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

  const toCategory = (category: string) => navigate({ to: '/transactions', search: { cat: [category] } })
  const toReview = period.filter(t => t.category !== 'Transfer' && needsReview(t)).length
  const latest = period.filter(t => t.category !== 'Transfer').slice(0, 8)
  const attention = connections.filter(c => c.status !== 'active')
  const contracts = contractData ? insightsOf(contractData.contracts, today, app.baseCurrency) : null
  const weekEnd = new Date(new Date(today).getTime() + 7 * 86_400_000).toISOString().slice(0, 10)
  const dueSoon = contracts?.upcoming.filter(u => u.date <= weekEnd && u.contract.currency === app.baseCurrency) ?? []
  const dueSoonTotal = dueSoon.reduce((sum, u) => sum + u.contract.amount, 0)
  const contractLines = contracts
    ? [
        contracts.rises.length > 0 &&
          `${contracts.rises.length} contract${contracts.rises.length === 1 ? '' : 's'} got more expensive`,
        contracts.fresh.length > 0 &&
          `${contracts.fresh.length} new contract${contracts.fresh.length === 1 ? '' : 's'} found: confirm ${contracts.fresh.length === 1 ? 'it' : 'them'}`,
        contracts.ended.length > 0 &&
          `${contracts.ended.length} contract${contracts.ended.length === 1 ? '' : 's'} stopped`,
        dueSoon.length > 0 &&
          `${dueSoon.length} contract payment${dueSoon.length === 1 ? '' : 's'} due this week (${formatCurrency(dueSoonTotal, app.baseCurrency)})`,
      ].filter((l): l is string => !!l)
    : []
  // Always this month, like the Budgets page, whatever period is picked above
  const nowDate = new Date(now)
  const budgetRowsNow = budgetRows(
    budgetLimits,
    app.displayTransactions,
    app.baseCurrency,
    nowDate,
    nowDate.getFullYear(),
    nowDate.getMonth(),
  )
  const budgetLine = alertLine(budgetRowsNow, app.baseCurrency)
  const budgetOver = budgetRowsNow.some(r => r.state === 'over')
  const hasAttention = budgetLine !== null || toReview > 0 || attention.length > 0 || contractLines.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{periodLabel(app.dateRange)} at a glance.</span>
            <TripsMovedNote />
          </span>
        }
      />
      <CurrencyRates
        base={app.baseCurrency}
        foreign={app.foreignCurrencies}
        rates={app.rates}
        onChange={app.onRatesChange}
      />
      <OverviewTiles a={analysis} currency={app.baseCurrency} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          {hasAttention && (
            <section className="card space-y-3" aria-label="Needs attention">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" /> Needs attention
              </h2>
              <ul className="space-y-2 text-sm">
                {budgetLine && (
                  <AttentionRow link={{ to: '/budgets' }} icon={Target} tone={budgetOver ? 'danger' : 'warn'}>
                    {budgetLine} this month
                  </AttentionRow>
                )}
                {toReview > 0 && (
                  <AttentionRow link={{ to: '/review' }} icon={Inbox} tone="info">
                    {toReview} transaction{toReview === 1 ? '' : 's'} need a category
                  </AttentionRow>
                )}
                {contractLines.map(line => (
                  <AttentionRow key={line} link={{ to: '/contracts' }} icon={Repeat} tone="warn">
                    {line}
                  </AttentionRow>
                ))}
                {attention.map(c => (
                  <AttentionRow
                    key={c.id}
                    link={{ to: '/banks/$connectionId', params: { connectionId: c.id } }}
                    icon={Landmark}
                    tone={c.status === 'expired' ? 'danger' : 'warn'}
                  >
                    {c.bank}: {c.status === 'expired' ? 'access has ended' : `access ends in ${c.daysLeft} days`}
                  </AttentionRow>
                ))}
              </ul>
            </section>
          )}

          <Highlights
            items={highlights.filter(h => !dismissed.has(h.id))}
            onDismiss={h => dismiss(h.id)}
            onOpen={h =>
              h.target?.kind === 'category'
                ? toCategory(h.target.category)
                : h.target && navigate({ to: '/transactions', search: { q: h.target.merchant } })
            }
          />
        </div>

        <div className="space-y-6">
          <AccountsCard balances={balances} baseCurrency={app.baseCurrency} rates={app.rates} now={now} />
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
                    <CategoryIcon category={t.category} size="sm" />
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
