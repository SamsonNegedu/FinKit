import IncomeReview from '../components/IncomeReview'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import PeriodTabs from '@/shared/components/layout/PeriodTabs'
import { inPeriod } from '@/shared/utils/summary'

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
