import { Link } from '@tanstack/react-router'
import { MS_PER_DAY } from '@/shared/constants/time'
import { formatCurrency } from '@/shared/utils/format'
import { monthlyInBase } from '@/shared/utils/amountInBase'
import { timeAgo, type AccountBalance } from '@/features/banking/api/banking.api'

/** What your accounts hold: each one, and a total in your base currency for those with a rate. */
export default function AccountsCard({
  balances,
  baseCurrency,
  rates,
  now,
}: {
  balances: AccountBalance[]
  baseCurrency: string
  rates: Record<string, number>
  /** Fixed for the visit, so "old" does not shift while the page is open */
  now: number
}) {
  if (balances.length === 0) {
    return null
  }
  const toBase = (b: AccountBalance) => monthlyInBase(b.amount, b.currency, baseCurrency, rates)
  const counted = balances.filter(b => toBase(b) !== null)
  const total = counted.reduce((sum, b) => sum + (toBase(b) ?? 0), 0)
  const left = balances.length - counted.length
  const oldest = Math.min(...balances.map(b => new Date(b.fetchedAt).getTime()))
  const stale = now - oldest > MS_PER_DAY

  return (
    <section className="card" aria-label="Accounts">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-ink">Accounts</h2>
        <span className="figure-sm">{formatCurrency(total, baseCurrency)}</span>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {balances.map(b => (
          <li key={`${b.connectionId}${b.account}`} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate text-midnight-200">
              {b.bank} <span className="text-midnight-500">{b.label}</span>
            </span>
            <span className={`whitespace-nowrap tabular-nums ${b.amount < 0 ? 'text-expense' : 'text-ink'}`}>
              {formatCurrency(b.amount, b.currency)}
            </span>
          </li>
        ))}
      </ul>
      <p className={`mt-2 text-xs ${stale ? 'text-warning' : 'text-midnight-500'}`}>
        {left > 0 && `${left} in another currency is not in the total (add a rate in Settings). `}
        Updated {timeAgo(new Date(oldest).toISOString())}; press Sync on{' '}
        <Link to="/banks" className="underline">
          Banks
        </Link>{' '}
        to refresh.
      </p>
    </section>
  )
}
