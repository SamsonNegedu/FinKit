import ReviewQueue from '@/features/review/components/ReviewQueue'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import PeriodTabs from '@/shared/components/layout/PeriodTabs'
import { inPeriod } from '@/shared/utils/summary'

export default function ReviewPage() {
  const app = useApp()
  const rows = inPeriod(app.displayTransactions, app.dateRange).filter(t => t.category !== 'Transfer')
  return (
    <div>
      <PageHeader title="Review" description="Transactions FinKit wasn't sure about." />
      <PeriodTabs />
      <ReviewQueue transactions={rows} onBulkUpdate={app.bulkUpdate} currency={app.baseCurrency} />
    </div>
  )
}
