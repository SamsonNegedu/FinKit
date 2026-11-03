import Tooltip from '@/shared/components/Tooltip'
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2, X } from 'lucide-react'
import TransactionTable from '@/shared/components/transactions/TransactionTable'
import type { TableBehaviour } from '@/shared/components/transactions/transactionTableTypes'
import { useApp } from '@/shared/contexts/AppState'
import type { Trip, TripTransaction } from '../api/trips.api'
import { useTagItems, useTripCategories, useTripSubcategories, useUntagItems } from '../hooks/trips-queries'
import { FUNDING_COLOR, tripCategoryColor } from '../utils/tripCategoryColor'
import { FUNDING, toTableRow } from '../utils/tripRows'
import { NOT_SPECIFIED } from '../constants/search.constants'
import EditItemDialog from './EditItemDialog'
import { editableFields } from './ItemFields'

const Chip = ({ children }: { children: string }) => (
  <span className="rounded-full bg-midnight-800 px-2 py-0.5 text-[11px] text-midnight-300">{children}</span>
)

const iconButton = 'rounded p-1 text-midnight-400 hover:bg-midnight-700 hover:text-white'

/** A trip's transactions in the same table as the monthly ones, with the trip's categories and actions. */
export default function TripTransactions({
  trip,
  rows: all,
  cat,
  sub,
}: {
  trip: Trip
  rows: TripTransaction[]
  /** Narrow to one category (and one subcategory of it), as picked in the breakdown */
  cat?: string
  sub?: string
}) {
  const navigate = useNavigate()
  const { baseCurrency, pushToast } = useApp()
  const { data: categories = [] } = useTripCategories()
  const { data: subcategories = {} } = useTripSubcategories()
  const tag = useTagItems()
  const untag = useUntagItems()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<TripTransaction | null>(null)
  const rows = useMemo(
    () =>
      cat
        ? all.filter(
            r =>
              r.kind === 'cost' &&
              (r.tripCategory ?? 'Other') === cat &&
              (sub === undefined || (sub === NOT_SPECIFIED ? !r.tripSubcategory : r.tripSubcategory === sub)),
          )
        : all,
    [all, cat, sub],
  )
  const table = useMemo(() => rows.map(toTableRow), [rows])
  const byRef = useMemo(() => new Map(rows.map(r => [r.ref, r])), [rows])

  const setCategory = (refs: string[], category: string) =>
    tag.mutate(
      {
        id: trip.id,
        items: refs.map(ref =>
          category === FUNDING ? { ref, kind: 'funding' as const } : { ref, kind: 'cost' as const, category },
        ),
      },
      {
        onSuccess: () =>
          pushToast({
            message: `${refs.length === 1 ? 'Transaction' : `${refs.length} transactions`} set to ${category}`,
            tone: 'success',
          }),
      },
    )
  const remove = (refs: string[]) => {
    untag.mutate(
      { id: trip.id, refs },
      {
        onSuccess: () =>
          pushToast({
            message: `Removed ${refs.length === 1 ? 'transaction' : `${refs.length} transactions`} from ${trip.name}`,
            tone: 'success',
          }),
      },
    )
    setSelected(new Set())
  }

  const behaviour: TableBehaviour = {
    categories: [FUNDING, ...categories],
    colorOf: c => (c === FUNDING ? FUNDING_COLOR : tripCategoryColor(c)),
    noSplit: true,
    // Picking a category with details goes straight on to the detail, so there is no need for the pencil
    detailsOf: category => (category === FUNDING ? [] : (subcategories[category] ?? [])),
    onPickDetail: (id, category, detail) => {
      const r = byRef.get(id)

      if (r) {
        tag.mutate({
          id: trip.id,
          items: [{ ref: r.ref, kind: 'cost', category, subcategory: detail || null }],
        })
      }
    },
    meta: tx => {
      const r = byRef.get(tx.id)

      return r && (r.manual || r.place || r.shared || r.paidBy) ? (
        <span className="flex flex-wrap gap-1 pt-0.5">
          {r.manual && <Chip>Added by hand</Chip>}
          {r.place && <Chip>{r.place}</Chip>}
          {r.shared && <Chip>Shared</Chip>}
          {r.paidBy && <Chip>{`Paid by ${r.paidBy}`}</Chip>}
        </span>
      ) : null
    },
    categoryNote: tx => {
      const detail = byRef.get(tx.id)?.tripSubcategory

      return detail ? (
        <span className="mt-0.5 block truncate px-3 text-xs text-midnight-400" title={detail}>
          {detail}
        </span>
      ) : null
    },
    rowActions: tx => {
      const r = byRef.get(tx.id)

      return r ? (
        <>
          {r.kind === 'cost' && (
            <Tooltip label={editableFields(trip, r.manual)}>
              <button className={iconButton} aria-label="Edit details" onClick={() => setEditing(r)}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip label={r.manual ? 'Delete this cost' : 'Back to its month'}>
            <button
              className={iconButton}
              aria-label={r.manual ? 'Delete this cost' : 'Back to its month'}
              onClick={() => remove([r.ref])}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </>
      ) : null
    },
    bulkActions: ids => (
      <button
        className="flex items-center gap-2 rounded-lg bg-midnight-700 px-3 py-1.5 text-sm hover:bg-midnight-600"
        onClick={() => remove(ids)}
      >
        <Trash2 className="h-4 w-4 text-midnight-400" /> Remove from trip
      </button>
    ),
  }

  return (
    <>
      {cat && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-midnight-300">
          <span>Showing</span>
          <span className="rounded-full bg-midnight-800 px-3 py-1 text-white">{sub ? `${cat} · ${sub}` : cat}</span>
          <button
            className="flex items-center gap-1 text-midnight-400 hover:text-white"
            onClick={() =>
              navigate({ to: '/trips/$tripId', params: { tripId: trip.id }, search: { tab: 'transactions' } })
            }
          >
            <X className="h-3.5 w-3.5" /> Show all
          </button>
        </div>
      )}
      {cat && rows.length === 0 && <p className="card text-midnight-300">Nothing here any more.</p>}
      <TransactionTable
        transactions={table}
        selectedIds={selected}
        onSelectionChange={setSelected}
        onSelectAll={() =>
          setSelected(prev => (prev.size === table.length ? new Set() : new Set(table.map(t => t.id))))
        }
        onUpdateTransaction={(id, updates) => updates.category && setCategory([id], updates.category)}
        onBulkCategoryChange={category => {
          setCategory([...selected], category)
          setSelected(new Set())
        }}
        onSetCategoryForIds={setCategory}
        currency={baseCurrency}
        viewMode="list"
        behaviour={behaviour}
      />
      {editing && <EditItemDialog trip={trip} row={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
