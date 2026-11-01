import { Transaction, DateRange } from '@/shared/types'
import { useSpendingTrendData } from './useSpendingTrendData'
import SpendingTrendCharts from './SpendingTrendCharts'

interface SpendingTrendProps {
  transactions: Transaction[]
  dateRange: DateRange | null
  currency: string
}

export default function SpendingTrend({ transactions, dateRange, currency }: SpendingTrendProps) {
  const { dailyData, cumulativeData } = useSpendingTrendData(transactions, dateRange)

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Spending Trend</h3>

      {dailyData.length > 0 ? (
        <SpendingTrendCharts dailyData={dailyData} cumulativeData={cumulativeData} currency={currency} />
      ) : (
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-midnight-400">No transaction data to display</p>
        </div>
      )}
    </div>
  )
}
