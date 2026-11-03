import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import SegmentedControl from '@/shared/components/forms/SegmentedControl'
import { useApp } from '@/shared/contexts/AppState'
import { formatCurrency } from '@/shared/utils/format'
import type { Trip, TripTotals } from '../api/trips.api'
import { tripCategoryColor } from '../utils/tripCategoryColor'
import { combineTotals, tripLength } from '../utils/tripMath'
import { DailyChart, Settlement, SliceBars, SubSlices } from './BreakdownCharts'
import { placeColor } from '../utils/placeColor'

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-midnight-400">{label}</p>
    <p className={`text-xl font-semibold ${tone ?? 'text-white'}`}>{value}</p>
  </div>
)

function Budget({ spent, budget, money }: { spent: number; budget: number; money: (n: number) => string }) {
  const used = Math.min(100, (spent / budget) * 100)
  const over = spent > budget

  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-midnight-300">Budget {money(budget)}</span>
        <span className={over ? 'text-expense' : 'text-midnight-300'}>
          {over ? `${money(spent - budget)} over` : `${money(budget - spent)} to go`}
        </span>
      </div>
      <div className="mt-1 h-2 rounded bg-midnight-800">
        <div
          className={`h-2 rounded ${over ? 'bg-expense' : spent / budget > 0.8 ? 'bg-orange-400' : 'bg-income'}`}
          style={{ width: `${used}%` }}
        />
      </div>
    </div>
  )
}

type View = 'category' | 'place' | 'day'

const VIEW_LABEL: Record<View, string> = { category: 'Category', place: 'Place', day: 'Day' }

/** What came in, what went out, and where, for one currency (or all of them converted). */
function Summary({ totals, trip }: { totals: TripTotals; trip: Trip }) {
  const money = (n: number) => formatCurrency(n, totals.currency)
  const navigate = useNavigate()
  const [picked, setView] = useState<View>('category')
  const days = tripLength(trip, totals.byDay.length)
  const show = (cat: string, sub?: string) =>
    navigate({ to: '/trips/$tripId', params: { tripId: trip.id }, search: { tab: 'transactions', cat, sub } })
  const hasPlaces = totals.byPlace.some(p => p.place !== 'Not assigned')
  // Only the views that have something to say; one chart at a time keeps a long trip short
  const views: View[] = [
    ...(totals.byCategory.length > 0 ? ['category' as const] : []),
    ...(hasPlaces ? ['place' as const] : []),
    ...(totals.byDay.length > 1 ? ['day' as const] : []),
  ]
  const view = views.includes(picked) ? picked : views[0]
  const outside = totals.byPhase.before + totals.byPhase.after
  const hasDates = !!(trip.startDate || trip.endDate)
  const notes = [
    // A flight or stay paid weeks before would otherwise make the days away look far dearer than they were
    days > 0 &&
      `${money((hasDates ? totals.byPhase.during : totals.spent) / days)} a day over ${days} day${days === 1 ? '' : 's'}${hasDates ? ' away' : ''}`,
    Math.abs(totals.mine - totals.spent) > 0.005 && `your share ${money(totals.mine)}`,
    hasDates && outside > 0.005 && `${money(outside)} was paid before or after the travel dates`,
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      {/* What is left only means something against money put in, so without any the box would just repeat Spent */}
      {totals.funded > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Money put in" value={money(totals.funded)} tone="text-income" />
          <Stat label="Spent" value={money(totals.spent)} tone="text-expense" />
          {totals.remaining < 0 ? (
            <Stat label="Overspent by" value={money(-totals.remaining)} tone="text-expense" />
          ) : (
            <Stat label="Left of what was put in" value={money(totals.remaining)} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Spent" value={money(totals.spent)} tone="text-expense" />
        </div>
      )}
      {totals.funded === 0 && totals.spent < 0 && (
        <p className="text-sm text-midnight-400">
          Spent is below zero because money that came in was added as a cost. Open Transactions and change it to money
          put in.
        </p>
      )}
      {trip.budget && trip.budgetCurrency === totals.currency && (
        <Budget spent={totals.spent} budget={trip.budget} money={money} />
      )}
      {notes.length > 0 && <p className="text-sm text-midnight-400">{notes.join(' · ')}</p>}
      {view && (
        <div className="space-y-3 border-t border-midnight-800 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-midnight-400">By</span>
            <SegmentedControl
              ariaLabel="Break the spending down by"
              value={view}
              onChange={setView}
              options={views.map(v => ({ value: v, label: VIEW_LABEL[v] }))}
            />
          </div>
          {view === 'category' && (
            <SliceBars
              items={totals.byCategory}
              label={c => c.category}
              colorOf={tripCategoryColor}
              money={money}
              onSelect={c => show(c.category)}
              detail={c => {
                const subs = totals.bySubcategory.filter(s => s.category === c.category)

                return subs.length > 0 ? (
                  <SubSlices total={c.amount} subs={subs} money={money} onSelect={sub => show(c.category, sub)} />
                ) : null
              }}
            />
          )}
          {view === 'place' && (
            <SliceBars items={totals.byPlace} label={p => p.place} colorOf={placeColor} money={money} />
          )}
          {view === 'day' && <DailyChart days={totals.byDay} money={money} />}
        </div>
      )}
      {totals.settlement.length > 0 && (
        <div className="border-t border-midnight-800 pt-4">
          <Settlement rows={totals.settlement} money={money} />
        </div>
      )}
    </div>
  )
}

/** One total in your main currency when rates are known; currencies without a rate get their own. */
export default function TripBreakdown({ totals, trip }: { totals: TripTotals[]; trip: Trip }) {
  const { baseCurrency, rates } = useApp()
  const { combined, separate, converted } = combineTotals(totals, baseCurrency, rates)

  return (
    <>
      {combined && <Summary totals={combined} trip={trip} />}
      {converted.length > 0 && (
        <p className="text-sm text-midnight-400">Converted from {converted.join(', ')} with your exchange rates.</p>
      )}
      {separate.map(t => (
        <div key={t.currency} className="space-y-2">
          <p className="text-sm text-midnight-400">
            No exchange rate for {t.currency}, so it is shown on its own. Add the rate to include it above.
          </p>
          <Summary totals={t} trip={trip} />
        </div>
      ))}
    </>
  )
}
