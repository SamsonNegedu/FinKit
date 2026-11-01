import ReviewQueue from '../components/ReviewQueue'
import { useApp } from '../app/AppState'
import PageHeader from '../app/PageHeader'
import PeriodTabs from '../components/PeriodTabs'
import { inPeriod } from '../lib/summary'

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
