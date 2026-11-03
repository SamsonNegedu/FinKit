import { useNavigate } from '@tanstack/react-router'
import AnalyticsHeadline from '../components/AnalyticsHeadline'
import { useMemo } from 'react'
import Highlights from '@/shared/components/insights/Highlights'
import { usePeriodAnalysis } from '@/shared/components/insights/usePeriodAnalysis'
import { useDismissedInsights } from '@/shared/components/insights/useDismissedInsights'
import CategoryBreakdown from '../components/CategoryBreakdown'
import MerchantList from '../components/MerchantList'
import CategoryByMonth from '../components/CategoryByMonth'
import TrendView from '../components/TrendView'
import { useApp } from '@/shared/contexts/AppState'
import { ANALYTICS_PATHS, type AnalyticsSection } from '../constants/search.constants'
import TabLinks from '@/shared/components/forms/TabLinks'
import YearView from '../components/YearView'
import { categoryByMonth } from '@/shared/utils/analysis/categoryMonths'
import { monthRange } from '@/shared/utils/periods'

const SECTION_LABELS: Record<AnalyticsSection, string> = {
  year: 'Your year',
  where: 'Where it went',
  months: 'Category by month',
  trend: 'Trend',
}

/**
 * Analytics is one section with a page per view, like Settings. The period picker and the headline numbers appear
 * only on the views that follow the period; Category by month, Your year and Trend have their own span.
 */
export function AnalyticsPage({ section }: { section: AnalyticsSection }) {
  const app = useApp()
  const navigate = useNavigate()
  const currency = app.baseCurrency
  const { dismissed, dismiss } = useDismissedInsights()
  const { analysis, highlights } = usePeriodAnalysis()
  const categoryMonths = useMemo(() => categoryByMonth(app.displayTransactions), [app.displayTransactions])
  const toCategory = (category: string) => navigate({ to: '/transactions', search: { cat: [category] } })
  const toMerchant = (merchant: string) => navigate({ to: '/transactions', search: { q: merchant } })

  // On wide screens the "where" view fills the screen below the header, so its two lists scroll inside their
  // cards instead of the page. 7rem is the sticky header plus the page padding.
  return (
    <div
      className={section === 'where' ? 'flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:min-h-[32rem]' : 'space-y-4'}
    >
      <TabLinks
        ariaLabel="Analytics views"
        links={(Object.keys(SECTION_LABELS) as AnalyticsSection[]).map(id => ({
          label: SECTION_LABELS[id],
          link: { to: ANALYTICS_PATHS[id] },
          active: section === id,
        }))}
      />
      {section === 'where' && (
        <>
          <AnalyticsHeadline a={analysis} currency={currency} />
          <Highlights
            collapsible
            items={highlights.filter(h => !dismissed.has(h.id))}
            onDismiss={h => dismiss(h.id)}
            onOpen={h =>
              h.target?.kind === 'category' ? toCategory(h.target.category) : h.target && toMerchant(h.target.merchant)
            }
          />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
            <CategoryBreakdown
              rows={analysis.categories}
              putAway={analysis.putAway}
              currency={currency}
              onSelect={toCategory}
              onSelectMerchant={toMerchant}
            />
            <MerchantList rows={analysis.merchants} currency={currency} onSelect={toMerchant} />
          </div>
        </>
      )}
      {section === 'months' && (
        <CategoryByMonth
          data={categoryMonths}
          currency={currency}
          onSelect={(category, m) => {
            app.setDateRange(monthRange(m.year, m.month))
            toCategory(category)
          }}
        />
      )}
      {section === 'year' && <YearView />}
      {section === 'trend' && <TrendView />}
    </div>
  )
}
