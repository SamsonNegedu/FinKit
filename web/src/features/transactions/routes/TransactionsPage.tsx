import TripsMovedNote from '@/features/trips/components/TripsMovedNote'
import { useMemo } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { X } from 'lucide-react'
import PeriodTabs from '@/shared/components/layout/PeriodTabs'
import SavedViews from '../components/SavedViews'
import ViewToggle from '../components/ViewToggle'
import MoreFilters from '../components/MoreFilters'
import SearchFilter from '../components/SearchFilter'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { FILES, TransactionsSearch } from '@/features/transactions/constants/search.constants'
import { inPeriod } from '@/shared/utils/summary'
import { isLeftOutTransfer } from '@/shared/utils/transfers'
import TransactionList from './TransactionList'
import { commonTraits, netOf } from '../utils/listSummary'
import { formatCurrency } from '@/shared/utils/format'

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
      if (!t.bankName) {
        files = true
      } else {
        const accounts = banks.get(t.bankName) ?? new Map<string, string>()

        if (t.accountRef) {
          accounts.set(t.accountRef, t.accountLabel ?? t.accountRef)
        }
        banks.set(t.bankName, accounts)
      }
    }

    return { banks, files }
  }, [period])

  const filtered = useMemo(() => {
    const q = search.q?.toLowerCase()

    return period.filter(tx => {
      if (search.bank === FILES ? !!tx.bankName : search.bank && tx.bankName !== search.bank) {
        return false
      }
      if (search.account && tx.accountRef !== search.account) {
        return false
      }
      if (!search.transfers && isLeftOutTransfer(tx)) {
        return false
      }
      if (
        q &&
        !`${tx.description} ${tx.displayName || ''} ${tx.merchant || ''} ${tx.category || ''} ${tx.recipient || ''} ${tx.note || ''}`
          .toLowerCase()
          .includes(q)
      ) {
        return false
      }
      if (search.cat?.length && !search.cat.includes(tx.category || 'Other')) {
        return false
      }

      return true
    })
  }, [period, search])

  const inData = useMemo(() => [...new Set(period.map(t => t.category || 'Other'))], [period])
  const accounts = search.bank && search.bank !== FILES ? [...(sources.banks.get(search.bank) ?? [])] : []
  const hasSources = sources.banks.size > 0

  const net = useMemo(() => netOf(filtered), [filtered])
  const traits = useMemo(() => commonTraits(filtered), [filtered])

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
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <span className="text-ink font-medium">{filtered.length}</span> of{' '}
              <span className="text-ink font-medium">{period.length}</span> in this period
            </span>
            <TripsMovedNote />
          </span>
        }
        actions={
          <div className="text-right">
            <p className="text-xs text-midnight-400">Net</p>
            <p className={`text-2xl font-semibold tabular-nums ${net < 0 ? 'text-expense' : 'text-ink'}`}>
              {net < 0 ? '-' : ''}
              {formatCurrency(Math.abs(net), app.baseCurrency)}
            </p>
          </div>
        }
      />

      <PeriodTabs />

      <div className="mb-4 space-y-3">
        <SearchFilter
          searchQuery={search.q ?? ''}
          onSearchChange={q => set({ q: q || undefined })}
          selectedCategories={search.cat ?? []}
          inData={inData}
          onCategoryChange={cat => set({ cat: cat.length ? cat : undefined })}
          extra={
            <>
              <MoreFilters
                sources={
                  hasSources || search.bank
                    ? [
                        ...[...sources.banks.keys()].map(b => ({ value: b, label: b })),
                        ...(sources.files || search.bank === FILES ? [{ value: FILES, label: 'Imported files' }] : []),
                      ]
                    : []
                }
                source={search.bank ?? ''}
                onSourceChange={bank => set({ bank: bank || undefined, account: undefined })}
                accounts={accounts.map(([ref, label]) => ({ value: ref, label }))}
                account={search.account ?? ''}
                onAccountChange={account => set({ account: account || undefined })}
                transfers={!!search.transfers}
                onTransfersChange={transfers => set({ transfers: transfers || undefined })}
                onClear={() => set({ bank: undefined, account: undefined, transfers: undefined })}
              />
              <div className="ml-auto">
                <ViewToggle
                  value={search.view === 'merchants' ? 'merchant' : 'list'}
                  onChange={mode => set({ view: mode === 'merchant' ? 'merchants' : undefined })}
                />
              </div>
            </>
          }
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
              className="text-sm text-midnight-400 hover:text-ink underline underline-offset-2"
            >
              Clear all
            </button>
            {search.bank && search.bank !== FILES && (
              <Link
                to="/banks"
                className="ml-auto text-sm text-midnight-400 hover:text-ink underline underline-offset-2"
              >
                Manage banks
              </Link>
            )}
          </div>
        )}
        <SavedViews current={search} onApply={view => navigate({ to: '/transactions', search: view })} />
      </div>

      {traits && <p className="mb-2 text-sm text-midnight-400">{traits}</p>}

      <TransactionList
        transactions={filtered}
        viewMode={search.view === 'merchants' ? 'merchant' : 'list'}
        onViewModeChange={mode => set({ view: mode === 'merchant' ? 'merchants' : undefined })}
      />
    </div>
  )
}
