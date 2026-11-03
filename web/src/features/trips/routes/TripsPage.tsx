import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plane, Plus } from 'lucide-react'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import TripFields, { EMPTY_TRIP, isTripDraftValid, tripPayload } from '../components/TripFields'
import type { TripSummary } from '../api/trips.api'
import { moneyInBase } from '../utils/tripMath'
import { displayNameOf } from '@/shared/utils/aliases'
import { formatCurrency } from '@/shared/utils/format'
import TripStarters from '../components/TripStarters'
import type { Candidate } from '../utils/tripCandidates'
import { useCreateTrip, useTagItems, useTrips } from '../hooks/trips-queries'
import { tripDates } from '../utils/tripDates'
import { tripBudgetBarFillClass, tripBudgetCaption, compareTripYearKeys } from '../utils/tripBudgetUi'

/** What the trip has cost, and where it stands against its budget or what was put in. */
function TripMoneyLine({ trip }: { trip: TripSummary }) {
  const { baseCurrency, rates } = useApp()
  const money = moneyInBase(trip.totals, baseCurrency, rates)
  const fmt = (n: number) => formatCurrency(n, baseCurrency)
  const budget = trip.budget && trip.budgetCurrency ? money.budget(trip.budget, trip.budgetCurrency) : undefined

  // Kept as a line rather than left out, so every card has the same shape and a row of cards lines up
  if (trip.transactionCount === 0 || (money.spent === 0 && money.funded === 0)) {
    return <span className="mt-auto block pt-3 text-sm text-midnight-500">Nothing spent yet</span>
  }
  const over = budget !== undefined && money.spent > budget
  const caption = tripBudgetCaption({
    budget,
    over,
    spent: money.spent,
    funded: money.funded,
    remaining: money.remaining,
    money: fmt,
  })
  const ratio = budget !== undefined && budget > 0 ? money.spent / budget : 0

  return (
    <span className="mt-auto block pt-3">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-semibold text-ink tabular-nums">
          {fmt(money.spent)} <span className="text-sm font-normal text-midnight-400">spent</span>
        </span>
        <span className={`text-sm tabular-nums ${over ? 'text-expense' : 'text-midnight-300'}`}>{caption}</span>
      </span>
      {budget !== undefined && budget > 0 && (
        <span className="mt-1.5 block h-1.5 rounded bg-midnight-800" aria-hidden>
          <span
            className={`block h-1.5 rounded ${tripBudgetBarFillClass(over, ratio)}`}
            style={{ width: `${Math.min(100, ratio * 100)}%` }}
          />
        </span>
      )}
      {money.partial && (
        <span className="mt-1 block text-xs text-midnight-500">
          Some currencies have no exchange rate and are left out.
        </span>
      )}
    </span>
  )
}

function TripGrid({ trips }: { trips: TripSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {trips.map(t => (
        <li key={t.id} className="flex">
          <Link
            to="/trips/$tripId"
            params={{ tripId: t.id }}
            className="card flex w-full items-stretch gap-3 hover:border-accent"
          >
            <Plane className="w-5 h-5 text-accent mt-0.5 shrink-0 self-start" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="block text-ink font-medium truncate">{t.name}</span>
              <span className="block text-sm text-midnight-400 truncate">
                {t.location} · {tripDates(t)}
              </span>
              <span className="block text-xs text-midnight-500 mt-1">
                {t.transactionCount} transaction{t.transactionCount === 1 ? '' : 's'}
              </span>
              <TripMoneyLine trip={t} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

const NO_DATES = 'No dates'

/** Trips grouped by the year they start in, newest year first and the newest trip first within it. Undated ones go last. */
function TripsByYear({ trips }: { trips: TripSummary[] }) {
  const groups = new Map<string, TripSummary[]>()

  for (const t of [...trips].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))) {
    const year = t.startDate?.slice(0, 4) ?? NO_DATES

    groups.set(year, [...(groups.get(year) ?? []), t])
  }
  const years = [...groups.keys()].sort((a, b) => compareTripYearKeys(a, b, NO_DATES))

  // One year on its own needs no heading
  if (years.length <= 1) {
    return <TripGrid trips={trips} />
  }

  return (
    <div className="space-y-6">
      {years.map(y => (
        <section key={y} className="space-y-3">
          <h2 className="text-sm font-medium text-midnight-300">{y}</h2>
          <TripGrid trips={groups.get(y)!} />
        </section>
      ))}
    </div>
  )
}

/** All trips. Their transactions are kept out of the monthly view. */
export default function TripsPage() {
  const { baseCurrency, pushToast } = useApp()
  const { data: trips = [], isLoading } = useTrips()
  const create = useCreateTrip()
  const tag = useTagItems()
  // A booking the trip is being started from: it joins the trip as soon as the trip exists
  const [seed, setSeed] = useState<Candidate | null>(null)
  const [draft, setDraft] = useState<typeof EMPTY_TRIP | null>(null)

  const save = async () => {
    const trip = await create.mutateAsync(tripPayload(draft!, baseCurrency))

    if (seed) {
      await tag.mutateAsync({
        id: trip.id,
        items: [
          {
            ref: seed.ref,
            kind: 'cost',
            category: seed.guess?.category ?? 'Other',
            ...(seed.guess?.subcategory ? { subcategory: seed.guess.subcategory } : {}),
          },
        ],
      })
    }
    pushToast({ message: `Created ${draft!.name.trim()}`, tone: 'success' })
    setDraft(null)
    setSeed(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        description="Spending paid from a separate balance. It stays out of your months."
        actions={
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              setSeed(null)
              setDraft(EMPTY_TRIP)
            }}
          >
            <Plus className="w-4 h-4" /> New trip
          </button>
        }
      />
      {draft && (
        <div className="card space-y-3">
          {seed && (
            <p className="text-sm text-midnight-300">
              {displayNameOf(seed.t)} ({formatCurrency(seed.t.amount, seed.t.currency)}) will be added to this trip. Set
              the travel dates and its other transactions are suggested.
            </p>
          )}
          <TripFields draft={draft} onChange={setDraft} currency={baseCurrency} />
          {create.error && <p className="text-sm text-expense">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <button
              className="btn-secondary"
              onClick={() => {
                setDraft(null)
                setSeed(null)
              }}
            >
              Cancel
            </button>
            <button className="btn-primary disabled:opacity-50" disabled={!isTripDraftValid(draft)} onClick={save}>
              Create
            </button>
          </div>
        </div>
      )}
      {!draft && (
        <TripStarters
          onStart={c => {
            setSeed(c)
            setDraft(EMPTY_TRIP)
          }}
        />
      )}
      {!isLoading && trips.length === 0 && !draft && (
        <div className="card text-midnight-300">
          No trips yet. Create one, or select bank transactions on the Transactions page and choose Trip.
        </div>
      )}
      <TripsByYear trips={trips.filter(t => !t.archived)} />
      {trips.some(t => t.archived) && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-midnight-400">Archived</h2>
          <TripsByYear trips={trips.filter(t => t.archived)} />
        </section>
      )}
    </div>
  )
}
