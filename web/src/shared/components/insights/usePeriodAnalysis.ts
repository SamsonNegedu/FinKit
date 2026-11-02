import { useMemo } from 'react'
import { useApp } from '@/shared/contexts/AppState'
import { analyze, daysIn, spanDays } from '@/shared/utils/analysis/analyze'
import { highlightsOf } from '@/shared/utils/analysis/highlights'
import { previousRange } from '@/shared/utils/analysis/previousPeriod'
import { unusualOf } from '@/shared/utils/analysis/unusual'
import { inPeriod } from '@/shared/utils/summary'

/**
 * What the chosen period holds: its transactions, the numbers worked out from them, and what stands out.
 * Worked out once per change of data or period, not on every render: it reads every transaction, and the
 * pages that use it (Overview, Analytics) re-render far more often than the data changes.
 */
export function usePeriodAnalysis() {
  const app = useApp()

  return useMemo(() => {
    const period = inPeriod(app.displayTransactions, app.dateRange)
    const earlier = previousRange(app.dateRange)
    const days = app.dateRange ? daysIn(app.dateRange.startDate, app.dateRange.endDate) : spanDays(period)
    const analysis = analyze(period, earlier ? inPeriod(app.displayTransactions, earlier) : null, days)

    return {
      period,
      analysis,
      highlights: highlightsOf(analysis, app.baseCurrency, unusualOf(period, app.displayTransactions)),
    }
  }, [app.displayTransactions, app.dateRange, app.baseCurrency])
}
