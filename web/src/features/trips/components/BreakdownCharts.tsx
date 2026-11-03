import CategoryIcon from '@/shared/components/CategoryIcon'
import Tooltip from '@/shared/components/Tooltip'
import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatDay } from '@/shared/utils/dates'
import type { Slice, TripTotals } from '../api/trips.api'
import { NOT_SPECIFIED } from '../constants/search.constants'

type Money = (n: number) => string

const SHOWN = 6

/**
 * Horizontal bars, largest first: where the money went. A long list stops at the biggest few, and an item
 * with detail (a category's subcategories) opens on request, so a busy trip stays readable.
 */
export function SliceBars<T extends Slice>({
  items,
  label,
  colorOf,
  money,
  detail,
  onSelect,
}: {
  items: T[]
  label: (item: T) => string
  colorOf: (name: string) => string
  money: Money
  /** Rows shown when an item is opened, such as its subcategories; null when it has none */
  detail?: (item: T) => ReactNode
  /** Makes each row open the transactions behind it */
  onSelect?: (item: T) => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [all, setAll] = useState(false)
  const largest = Math.max(...items.map(i => i.amount), 1)
  const shown = all ? items : items.slice(0, SHOWN)
  const toggle = (name: string) =>
    setOpen(prev => {
      const next = new Set(prev)

      if (!next.delete(name)) {
        next.add(name)
      }

      return next
    })

  return (
    <div>
      <ul className="space-y-3">
        {shown.map(i => {
          const name = label(i)
          const more = detail?.(i)
          const expanded = open.has(name)

          return (
            <li key={name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-midnight-200">
                  <CategoryIcon category={name} color={colorOf(name)} size="sm" />
                  {onSelect ? (
                    <Tooltip label={`Show ${name} transactions`}>
                      <button className="truncate hover:text-ink hover:underline" onClick={() => onSelect(i)}>
                        {name}
                      </button>
                    </Tooltip>
                  ) : (
                    <span className="truncate">{name}</span>
                  )}
                  {more && (
                    <button
                      className="flex items-center rounded p-0.5 text-midnight-500 hover:bg-midnight-800 hover:text-ink"
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Hide' : 'Show'} the details of ${name}`}
                      onClick={() => toggle(name)}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-midnight-300">
                  {i.amount < 0 ? `${money(i.amount)} refunded` : `${money(i.amount)} · ${Math.round(i.share)}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-midnight-800">
                {i.amount > 0 && (
                  <div
                    className="h-1.5 rounded"
                    style={{ width: `${Math.max(2, (i.amount / largest) * 100)}%`, backgroundColor: colorOf(name) }}
                  />
                )}
              </div>
              {expanded && more}
            </li>
          )
        })}
      </ul>
      {items.length > SHOWN && (
        <button className="mt-3 text-sm text-accent hover:underline" onClick={() => setAll(v => !v)}>
          {all ? 'Show fewer' : `Show ${items.length - SHOWN} more`}
        </button>
      )}
    </div>
  )
}

/** The parts of one category that were given a subcategory, with what is left over listed as not specified. */
export function SubSlices({
  total,
  subs,
  money,
  onSelect,
}: {
  total: number
  subs: TripTotals['bySubcategory']
  money: Money
  onSelect: (subcategory: string) => void
}) {
  if (subs.length === 0 || total <= 0) {
    return null
  }
  const rest = total - subs.reduce((sum, s) => sum + s.amount, 0)
  const rows = [
    ...subs.map(s => ({ name: s.subcategory, amount: s.amount })),
    ...(rest > 0.005 ? [{ name: NOT_SPECIFIED, amount: rest }] : []),
  ]

  return (
    <ul className="mt-1.5 space-y-0.5 border-l border-line-strong pl-3">
      {rows.map(r => (
        <li key={r.name} className="flex justify-between text-xs text-midnight-400">
          <Tooltip label={`Show ${r.name} transactions`}>
            <button className="hover:text-ink hover:underline" onClick={() => onSelect(r.name)}>
              {r.name}
            </button>
          </Tooltip>
          <span className="tabular-nums">
            {money(r.amount)} · {Math.round((r.amount / total) * 100)}%
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Spending per day, in date order, with the busiest day named so the bars need no axis. */
export function DailyChart({ days, money }: { days: TripTotals['byDay']; money: Money }) {
  const peak = days.reduce((best, d) => (d.amount > best.amount ? d : best), days[0])
  const largest = Math.max(peak.amount, 1)

  return (
    <div>
      <p className="mb-2 text-xs text-midnight-400">
        Busiest day {formatDay(peak.date)} · {money(peak.amount)}
      </p>
      <div className="flex h-24 items-end gap-0.5 overflow-x-auto" role="img" aria-label="Spending per day">
        {days.map(d => (
          <Tooltip key={d.date} label={`${formatDay(d.date)}: ${money(d.amount)}`}>
            <div className="group flex h-full min-w-1 flex-1 flex-col justify-end">
              <div
                className="rounded-t bg-accent group-hover:bg-accent-dark"
                style={{ height: `${Math.max(3, (Math.max(d.amount, 0) / largest) * 100)}%` }}
              />
            </div>
          </Tooltip>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-midnight-500">
        <span>{formatDay(days[0].date)}</span>
        <span>{formatDay(days[days.length - 1].date)}</span>
      </div>
    </div>
  )
}

/** Who owes whom on costs split between travelers. */
export function Settlement({ rows, money }: { rows: TripTotals['settlement']; money: Money }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-midnight-300">Shared costs</h3>
      <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(r => (
          <li key={r.name} className="flex justify-between">
            <span className="text-midnight-200">{r.amount > 0 ? `${r.name} owes you` : `You owe ${r.name}`}</span>
            <span className={r.amount > 0 ? 'text-income' : 'text-expense'}>{money(Math.abs(r.amount))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
