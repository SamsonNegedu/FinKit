import Tooltip from '@/shared/components/Tooltip'
import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Plane } from 'lucide-react'
import { useApp } from '@/shared/contexts/AppState'
import { formatCurrency } from '@/shared/utils/format'
import { linkKey } from '@/shared/utils/ids'
import { applyRates } from '@/shared/utils/rates'
import { inPeriod } from '@/shared/utils/summary'
import { useTrips } from '../hooks/trips-queries'

/**
 * Trip transactions are left out of the months, so the months no longer add up to the bank statement.
 * A short link that says how much moved out of the period, so the difference can be explained.
 */
export default function TripsMovedNote() {
  const app = useApp()
  const { data: trips = [] } = useTrips(app.tripLinks.tripKeys.size > 0)

  const moved = useMemo(() => {
    const inTrips = app.transactions.filter(t => app.tripLinks.tripKeys.has(linkKey(t)))
    const here = applyRates(inPeriod(inTrips, app.dateRange), app.baseCurrency, app.rates).filter(
      t => t.currency === app.baseCurrency,
    )
    const perTrip = new Map<string, number>()

    for (const t of here) {
      const id = app.tripLinks.tripKeys.get(linkKey(t))!

      perTrip.set(id, (perTrip.get(id) ?? 0) + t.amount)
    }

    return { count: here.length, net: here.reduce((sum, t) => sum + t.amount, 0), perTrip }
  }, [app.transactions, app.tripLinks.tripKeys, app.dateRange, app.baseCurrency, app.rates])

  if (moved.count === 0) {
    return null
  }
  const name = (id: string) => trips.find(t => t.id === id)?.name ?? 'a trip'
  const detail = [...moved.perTrip]
    .map(([id, amount]) => `${name(id)} ${formatCurrency(amount, app.baseCurrency)}`)
    .join(', ')

  return (
    <Tooltip
      label={`Not in the totals: ${moved.count} transaction${moved.count === 1 ? '' : 's'} moved to trips (${detail})`}
    >
      <Link to="/trips" className="inline-flex items-center gap-1.5 text-accent hover:underline">
        <Plane className="h-3.5 w-3.5" />
        {formatCurrency(moved.net, app.baseCurrency)} in trips
      </Link>
    </Tooltip>
  )
}
