import { useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Search } from 'lucide-react'
import { BankInfo } from '@/features/banking/api/banking.api'
import { errorMessage, useBanks, useConnections, useStartConnect } from '@/features/banking/hooks/banking-queries'
import BankTile from './BankTile'

const PINNED = ['Mock ASPSP', 'N26', 'Wise', 'Revolut']

/** Choose a bank, see what will be read, then continue to the bank's own approval page. */
export default function ConnectBank({ initialBank }: { initialBank?: string }) {
  const banksQuery = useBanks()
  const connect = useStartConnect()
  const { data: connections = [] } = useConnections()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(initialBank ?? null)

  const banks = banksQuery.data
  const shown = useMemo(() => {
    const all = banks ?? []
    const q = query.trim().toLowerCase()

    if (!q) {
      return {
        pinned: PINNED.map(n => all.find(b => b.name === n)).filter((b): b is BankInfo => !!b),
        results: [] as BankInfo[],
      }
    }

    return {
      pinned: [] as BankInfo[],
      results: all.filter(b => b.name.toLowerCase().includes(q)).slice(0, 30),
    }
  }, [banks, query])
  const bank = banks?.find(b => b.name === selected)
  const already = connections.filter(c => c.bank === bank?.name)
  const have = already.flatMap(c => c.accounts.map(a => a.label))

  if (banksQuery.isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    )
  }
  if (banksQuery.isError || !banks) {
    return (
      <div
        className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300"
        role="alert"
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {errorMessage(banksQuery.error, "Couldn't load banks.")}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="w-4 h-4 text-midnight-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="input w-full pl-9"
          placeholder={`Search ${banks.length.toLocaleString()} banks`}
          aria-label="Search banks"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {shown.pinned.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {shown.pinned.map(b => (
            <BankTile key={b.name} name={b.name} selected={selected === b.name} onSelect={setSelected} />
          ))}
        </div>
      )}
      {query && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {shown.results.map(b => (
            <BankTile
              key={`${b.name}-${b.country}`}
              name={b.name}
              selected={selected === b.name}
              onSelect={setSelected}
            />
          ))}
          {shown.results.length === 0 && (
            <p className="text-sm text-midnight-400 col-span-full">No bank matches “{query}”.</p>
          )}
        </div>
      )}

      {bank && (
        <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 space-y-2 text-sm">
          <p className="font-medium text-white">What FinKit will read from {bank.name}</p>
          <ul className="space-y-1 text-midnight-200">
            <li>✓ Your account names and last 4 digits</li>
            <li>✓ Balances and transactions</li>
            <li>
              <span className="text-red-300">✕</span> It cannot move money or make payments
            </li>
          </ul>
          <p className="text-midnight-400 text-xs">
            Access lasts up to {Math.min(bank.maxConsentDays, 180)} days. You can disconnect any time here or in your
            bank's app. You'll log in on {bank.name}'s own page. FinKit never sees your password.
          </p>
        </div>
      )}

      {bank && have.length > 0 && (
        <p className="rounded-lg border border-midnight-600 bg-midnight-800/60 p-3 text-sm text-midnight-200">
          You already have {bank.name} connected ({have.join(', ')}). On {bank.name}'s page, tick every account you want
          read: new ones are added, and an account you leave out keeps syncing through its current link.
        </p>
      )}

      {connect.isError && (
        <p className="text-sm text-red-300" role="alert">
          {errorMessage(connect.error, "Couldn't start the connection.")}
        </p>
      )}

      <div className="flex justify-end">
        <button
          className="btn-primary disabled:opacity-50"
          disabled={!bank || connect.isPending}
          onClick={() => bank && connect.mutate({ bank: bank.name, country: bank.country })}
        >
          {connect.isPending ? 'Opening…' : bank ? `Continue to ${bank.name} →` : 'Choose a bank'}
        </button>
      </div>
    </div>
  )
}
