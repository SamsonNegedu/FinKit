import { useNavigate } from '@tanstack/react-router'
import CategoryChart from '../components/charts/CategoryChart'
import TopExpenses from '../components/charts/TopExpenses'
import SpendingTrend from '../components/charts/SpendingTrend'
import { useApp } from '../app/AppState'
import PageHeader from '../app/PageHeader'
import PeriodTabs from '../components/PeriodTabs'
import { inPeriod, summarize } from '../lib/summary'

export function AnalyticsPage() {
  const app = useApp()
  const navigate = useNavigate()
  const summary = summarize(inPeriod(app.displayTransactions, app.dateRange), app.dateRange, app.baseCurrency)
  return (
    <div>
      <PageHeader title="Analytics" description="Where the money went. Click anything to see its transactions." />
      <PeriodTabs />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart
          categorySummary={summary.categorySummary}
          currency={summary.currency}
          onSelectCategory={category => navigate({ to: '/transactions', search: { cat: [category] } })}
        />
        <TopExpenses
          topMerchants={summary.topMerchants}
          currency={summary.currency}
          onSelectMerchant={merchant => navigate({ to: '/transactions', search: { q: merchant } })}
        />
      </div>
    </div>
  )
}

export function TrendsPage() {
  const app = useApp()
  const rows = inPeriod(app.displayTransactions, app.dateRange)
  return (
    <div>
      <PageHeader title="Trends" description="Daily and running spend over the period." />
      <PeriodTabs />
      <SpendingTrend transactions={rows} dateRange={app.dateRange} currency={app.baseCurrency} />
    </div>
  )
}
