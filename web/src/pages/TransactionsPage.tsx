import { useMemo } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { X } from 'lucide-react'
import PeriodTabs from '../components/PeriodTabs'
import SavedViews from '../components/SavedViews'
import SearchFilter from '../components/SearchFilter'
import { useApp } from '../app/AppState'
import PageHeader from '../app/PageHeader'
import { FILES, TransactionsSearch } from '../app/search'
import { inPeriod } from '../lib/summary'
import TransactionList from './TransactionList'

export default function TransactionsPage() {
  const app = useApp()
  const search = useSearch({ from: '/transactions' }) as TransactionsSearch
  const navigate = useNavigate({ from: '/transactions' })
  const set = (patch: Partial<TransactionsSearch>, replace = true) =>
    navigate({ to: '/transactions', search: prev => ({ ...prev, ...patch }), replace })

  const period = useMemo(
    () => inPeriod(app.displayTransactions, app.dateRange),
    [app.displayTransactions, app.dateRange],
  )

  // Where the rows came from: each connected bank, and anything imported from files
  const sources = useMemo(() => {
    const banks = new Map<string, Map<string, string>>() // bank → accountRef → label
    let files = false
    for (const t of period) {
      if (!t.bankName) files = true
      else {
        const accounts = banks.get(t.bankName) ?? new Map<string, string>()
        if (t.accountRef) accounts.set(t.accountRef, t.accountLabel ?? t.accountRef)
        banks.set(t.bankName, accounts)
      }
    }
    return { banks, files }
  }, [period])

  const filtered = useMemo(() => {
    const q = search.q?.toLowerCase()
    return period.filter(tx => {
      if (search.bank === FILES ? !!tx.bankName : search.bank && tx.bankName !== search.bank) return false
      if (search.account && tx.accountRef !== search.account) return false
      if (!search.transfers && tx.category === 'Transfer') return false
      if (
        q &&
        !`${tx.description} ${tx.displayName || ''} ${tx.merchant || ''} ${tx.category || ''} ${tx.recipient || ''}`
          .toLowerCase()
          .includes(q)
      )
        return false
      if (search.cat?.length && !search.cat.includes(tx.category || 'Other')) return false
      return true
    })
  }, [period, search])

  const accounts = search.bank && search.bank !== FILES ? [...(sources.banks.get(search.bank) ?? [])] : []
  const hasSources = sources.banks.size > 0

  const chips: Array<{ label: string; remove: () => void }> = [
    ...(search.q ? [{ label: `“${search.q}”`, remove: () => set({ q: undefined }) }] : []),
    ...(search.cat ?? []).map(c => ({
      label: c,
      remove: () => set({ cat: search.cat!.filter(x => x !== c) || undefined }),
    })),
    ...(search.bank
      ? [
          {
            label: search.bank === FILES ? 'Imported files' : search.bank,
            remove: () => set({ bank: undefined, account: undefined }),
          },
        ]
      : []),
    ...(search.account
      ? [
          {
            label: accounts.find(([ref]) => ref === search.account)?.[1] ?? 'Account',
            remove: () => set({ account: undefined }),
          },
        ]
      : []),
    ...(search.transfers ? [{ label: 'Including transfers', remove: () => set({ transfers: undefined }) }] : []),
  ]

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={
          <>
            Showing <span className="text-white font-medium">{filtered.length}</span> of{' '}
            <span className="text-white font-medium">{period.length}</span> in this period
          </>
        }
      />

      <PeriodTabs />

      <div className="card mb-4 space-y-4">
        <SearchFilter
          searchQuery={search.q ?? ''}
          onSearchChange={q => set({ q: q || undefined })}
          selectedCategories={search.cat ?? []}
          onCategoryChange={cat => set({ cat: cat.length ? cat : undefined })}
          showTransfers={!!search.transfers}
          onShowTransfersChange={transfers => set({ transfers: transfers || undefined })}
        />

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
            {chips.map(c => (
              <button
                key={c.label}
                onClick={c.remove}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 pl-3 pr-2 py-1 text-sm hover:bg-accent/25"
                aria-label={`Remove filter ${c.label}`}
              >
                {c.label} <X className="w-3.5 h-3.5" />
              </button>
            ))}
            <button
              onClick={() => navigate({ to: '/transactions', search: {}, replace: true })}
              className="text-sm text-midnight-400 hover:text-white underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}
        <SavedViews current={search} onApply={view => navigate({ to: '/transactions', search: view })} />

        {(hasSources || search.bank) && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label htmlFor="source-bank" className="text-midnight-400">
              Source
            </label>
            <select
              id="source-bank"
              className="input py-1.5 text-sm"
              value={search.bank ?? ''}
              onChange={e => set({ bank: e.target.value || undefined, account: undefined })}
            >
              <option value="">All sources</option>
              {[...sources.banks.keys()].map(b => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              {(sources.files || search.bank === FILES) && <option value={FILES}>Imported files</option>}
            </select>
            {accounts.length > 0 && (
              <>
                <label htmlFor="source-account" className="text-midnight-400">
                  Account
                </label>
                <select
                  id="source-account"
                  className="input py-1.5 text-sm"
                  value={search.account ?? ''}
                  onChange={e => set({ account: e.target.value || undefined })}
                >
                  <option value="">All accounts</option>
                  {accounts.map(([ref, label]) => (
                    <option key={ref} value={ref}>
                      {label}
                    </option>
                  ))}
                </select>
              </>
            )}
            {(search.bank || search.account) && (
              <button
                onClick={() => set({ bank: undefined, account: undefined })}
                className="inline-flex items-center gap-1 text-midnight-300 hover:text-white"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            {search.bank && search.bank !== FILES && (
              <Link to="/banks" className="text-midnight-400 hover:text-white underline underline-offset-2 ml-auto">
                Manage banks
              </Link>
            )}
          </div>
        )}
      </div>

      <TransactionList
        transactions={filtered}
        viewMode={search.view === 'merchants' ? 'merchant' : 'list'}
        onViewModeChange={mode => set({ view: mode === 'merchant' ? 'merchants' : undefined })}
      />
    </div>
  )
}
