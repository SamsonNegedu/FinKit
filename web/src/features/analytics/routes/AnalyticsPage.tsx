import { useNavigate, useSearch } from '@tanstack/react-router'
import AnalyticsHeadline from '../components/AnalyticsHeadline'
import { useMemo } from 'react'
import Highlights from '@/shared/components/insights/Highlights'
import { usePeriodAnalysis } from '@/shared/components/insights/usePeriodAnalysis'
import { useDismissedInsights } from '@/shared/components/insights/useDismissedInsights'
import CategoryBreakdown from '../components/CategoryBreakdown'
import MerchantList from '../components/MerchantList'
import MonthByMonth from '../components/MonthByMonth'
import CategoryByMonth from '../components/CategoryByMonth'
import SpendingTrend from '../components/charts/SpendingTrend'
import { useApp } from '@/shared/contexts/AppState'
import type { AnalyticsSearch, AnalyticsTab } from '../constants/search.constants'
import Tabs from '@/shared/components/forms/Tabs'
import PageHeader from '@/shared/components/layout/PageHeader'
import PeriodTabs from '@/shared/components/layout/PeriodTabs'
import { inPeriod } from '@/shared/utils/summary'
import { monthlySeries } from '@/shared/utils/analysis/monthly'
import { categoryByMonth } from '@/shared/utils/analysis/categoryMonths'
import { monthRange } from '@/shared/utils/periods'

export function AnalyticsPage() {
  const app = useApp()
  const navigate = useNavigate()
  const { tab = 'where' } = useSearch({ from: '/analytics' }) as AnalyticsSearch
  const currency = app.baseCurrency
  const { dismissed, dismiss } = useDismissedInsights()
  const { analysis, highlights } = usePeriodAnalysis()
  const months = useMemo(() => monthlySeries(app.displayTransactions), [app.displayTransactions])
  const categoryMonths = useMemo(() => categoryByMonth(app.displayTransactions), [app.displayTransactions])
  const toCategory = (category: string) => navigate({ to: '/transactions', search: { cat: [category] } })
  const toMerchant = (merchant: string) => navigate({ to: '/transactions', search: { q: merchant } })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        description="Where the money went and what changed. Click anything to see its transactions."
      />
      <PeriodTabs />
      <AnalyticsHeadline a={analysis} currency={currency} />
      <Tabs
        value={tab as AnalyticsTab}
        onChange={next => navigate({ to: '/analytics', search: next === 'where' ? {} : { tab: next } })}
        tabs={[
          {
            value: 'where',
            label: 'Where it went',
            content: (
              <>
                <Highlights
                  items={highlights.filter(h => !dismissed.has(h.id))}
                  onDismiss={h => dismiss(h.id)}
                  onOpen={h =>
                    h.target?.kind === 'category'
                      ? toCategory(h.target.category)
                      : h.target && toMerchant(h.target.merchant)
                  }
                />
                <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
                  <CategoryBreakdown rows={analysis.categories} currency={currency} onSelect={toCategory} />
                  <MerchantList rows={analysis.merchants} currency={currency} onSelect={toMerchant} />
                </div>
              </>
            ),
          },
          {
            value: 'months',
            label: 'Months',
            content: (
              <>
                <CategoryByMonth
                  data={categoryMonths}
                  currency={currency}
                  onSelect={(category, m) => {
                    app.setDateRange(monthRange(m.year, m.month))
                    toCategory(category)
                  }}
                />
                <MonthByMonth
                  rows={months}
                  currency={currency}
                  onSelect={m => app.setDateRange(monthRange(m.year, m.month))}
                />
              </>
            ),
          },
          {
            value: 'trend',
            label: 'Trend',
            content: (
              <SpendingTrend
                transactions={inPeriod(app.displayTransactions, app.dateRange)}
                dateRange={app.dateRange}
                currency={currency}
              />
            ),
          },
        ]}
      />
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
