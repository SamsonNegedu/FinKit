import IncomeReview from '../components/IncomeReview'
import { useApp } from '../app/AppState'
import PageHeader from '../app/PageHeader'
import PeriodTabs from '../components/PeriodTabs'
import { inPeriod } from '../lib/summary'

export default function IncomePage() {
  const app = useApp()
  return (
    <div>
      <PageHeader title="Income" description="Check what counts as income." />
      <PeriodTabs />
      <IncomeReview
        transactions={inPeriod(app.displayTransactions, app.dateRange)}
        onUpdateTransaction={app.updateTransaction}
        currency={app.baseCurrency}
      />
    </div>
  )
}
