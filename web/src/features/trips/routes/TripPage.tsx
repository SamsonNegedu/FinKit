import { useState } from 'react'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import Tabs from '@/shared/components/forms/Tabs'
import PageHeader from '@/shared/components/layout/PageHeader'
import AddEntryDialog from '../components/AddEntryDialog'
import TripBreakdown from '../components/TripBreakdown'
import TripManage from '../components/TripManage'
import TripSuggestions from '../components/TripSuggestions'
import TripTransactions from '../components/TripTransactions'
import { useTrip } from '../hooks/trips-queries'
import { tripDates } from '../utils/tripDates'
import type { TripSearch } from '../constants/search.constants'

/** One trip: money in, money out, what it was spent on, and the transactions behind it. */
export default function TripPage() {
  const { tripId } = useParams({ from: '/trips/$tripId' })
  const { data, isLoading, error } = useTrip(tripId)
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const search = useSearch({ from: '/trips/$tripId' }) as TripSearch
  const tab = search.tab ?? 'breakdown'

  if (isLoading) {
    return <p className="text-midnight-400">Loading…</p>
  }
  if (error || !data) {
    return (
      <div className="card space-y-3">
        <p className="text-white">That trip doesn't exist.</p>
        <Link to="/trips" className="btn-secondary inline-block">
          All trips
        </Link>
      </div>
    )
  }
  const { trip, transactions, totals, missing } = data
  const empty = (
    <div className="card text-midnight-300">
      Nothing here yet. Select bank transactions on the Transactions page and choose Trip, or add a cost by hand.
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={trip.name}
        description={`${trip.location} · ${tripDates(trip)}${trip.archived ? ' · Archived' : ''}`}
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> Add cost
          </button>
        }
      />
      {!trip.archived && <TripSuggestions trip={trip} />}
      <Tabs
        value={tab}
        onChange={next =>
          navigate({ to: '/trips/$tripId', params: { tripId }, search: next === 'breakdown' ? {} : { tab: next } })
        }
        tabs={[
          {
            value: 'breakdown',
            label: 'Breakdown',
            content: transactions.length ? <TripBreakdown totals={totals} trip={trip} /> : empty,
          },
          {
            value: 'transactions',
            label: 'Transactions',
            count: transactions.length,
            content: transactions.length ? (
              <TripTransactions trip={trip} rows={transactions} cat={search.cat} sub={search.sub} />
            ) : (
              empty
            ),
          },
          { value: 'manage', label: 'Manage', content: <TripManage trip={trip} /> },
        ]}
      />
      {adding && <AddEntryDialog trip={trip} onClose={() => setAdding(false)} />}
      {missing > 0 && (
        <p className="text-sm text-midnight-500">
          {missing} transaction{missing === 1 ? ' is' : 's are'} no longer stored and not counted.
        </p>
      )}
    </div>
  )
}
