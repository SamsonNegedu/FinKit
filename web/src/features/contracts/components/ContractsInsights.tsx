import { ArrowUpRight, CalendarClock, Sparkles, StopCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatCurrency } from '@/shared/utils/format'
import type { Contract } from '../api/contracts.api'
import type { Insights } from '../utils/contractInsights'

const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function Item({ icon, children, onOpen }: { icon: ReactNode; children: ReactNode; onOpen: () => void }) {
  return (
    <li>
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-midnight-800/70"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{children}</span>
      </button>
    </li>
  )
}

/** Two short lists: what deserves a look now, and what is about to be paid. Each line opens that contract. */
export default function ContractsInsights({
  insights,
  currency,
  onOpen,
}: {
  insights: Insights
  currency: string
  onOpen: (c: Contract) => void
}) {
  const { rises, fresh, ended, upcoming, leftThisMonth } = insights
  const look = rises.length + fresh.length + ended.length
  const icon = 'h-4 w-4 shrink-0'

  if (look === 0 && upcoming.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
      {look > 0 && (
        <section className="card min-w-0 !p-4">
          <h2 className="text-xs uppercase tracking-wide text-midnight-500">Worth a look</h2>
          <ul className="mt-2">
            {rises.map(c => (
              <Item
                key={`r${c.id}`}
                onOpen={() => onOpen(c)}
                icon={<ArrowUpRight className={`${icon} text-amber-300`} />}
              >
                <span className="text-white">{c.name}</span>{' '}
                <span className="text-midnight-400">
                  now {formatCurrency(c.priceChange!.to, c.currency)}, was{' '}
                  {formatCurrency(c.priceChange!.from, c.currency)}
                </span>
              </Item>
            ))}
            {fresh.map(c => (
              <Item key={`n${c.id}`} onOpen={() => onOpen(c)} icon={<Sparkles className={`${icon} text-accent`} />}>
                <span className="text-white">{c.name}</span>{' '}
                <span className="text-midnight-400">is new: confirm it?</span>
              </Item>
            ))}
            {ended.map(c => (
              <Item
                key={`e${c.id}`}
                onOpen={() => onOpen(c)}
                icon={<StopCircle className={`${icon} text-midnight-400`} />}
              >
                <span className="text-white">{c.name}</span>{' '}
                <span className="text-midnight-400">stopped{c.lastDate ? `, last paid ${day(c.lastDate)}` : ''}</span>
              </Item>
            ))}
          </ul>
        </section>
      )}
      {upcoming.length > 0 && (
        <section className="card min-w-0 !p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-wide text-midnight-500">Coming up</h2>
            <span className="text-xs text-midnight-400">{formatCurrency(leftThisMonth, currency)} left this month</span>
          </div>
          <ul className="mt-2">
            {upcoming.slice(0, 6).map(({ contract: c, date }) => (
              <Item
                key={c.id}
                onOpen={() => onOpen(c)}
                icon={<CalendarClock className={`${icon} text-midnight-400`} />}
              >
                <span className="text-white">{c.name}</span>{' '}
                <span className="text-midnight-400">
                  {day(date)} · {formatCurrency(c.amount, c.currency)}
                </span>
              </Item>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
