import Tooltip from '@/shared/components/Tooltip'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  FilePlus,
  Inbox,
  Landmark,
  LayoutDashboard,
  List,
  Loader2,
  Menu,
  PieChart,
  Plane,
  Repeat,
  Target,
  BookOpen,
  Settings,
  Shield,
  ShieldOff,
  Wallet,
  X,
} from 'lucide-react'
import BankBanners from '@/features/banking/components/BankBanners'
import StoredBankTransactions from '@/features/banking/components/StoredBankTransactions'
import HeaderMenu from '@/shared/components/layout/HeaderMenu'
import PeriodPicker from '@/shared/components/layout/PeriodPicker'
import { needsReview } from '@/features/review/components/ReviewQueue'
import { inPeriod } from '@/shared/utils/summary'
import { useBankingStatus, useConnections, useStartConnect } from '@/features/banking/hooks/banking-queries'
import Breadcrumbs from '@/shared/components/layout/Breadcrumbs'
import { useApp } from '@/shared/contexts/AppState'
import AppShellSidebar, { type AppShellNavItem } from './AppShellSidebar'

export default function AppShell() {
  const app = useApp()
  const { data: banking } = useBankingStatus()
  const { data: connections = [] } = useConnections()
  const reconnect = useStartConnect()
  const [navOpen, setNavOpen] = useState(false)
  const hasData = app.transactions.length > 0
  const attention = connections.filter(c => c.status !== 'active').length
  const path = useRouterState({ select: s => s.location.pathname }).replace(/^\/app/, '') || '/'
  // A page that is a wide table (Analytics) uses the whole width; the rest keep a readable column
  const wide = path.startsWith('/analytics')
  // The period picker belongs only to the pages that follow it. Elsewhere it would show a period the page ignores
  // (Budgets has its own month, Your year its own year), which reads as a contradiction.
  const followsPeriod =
    path === '/' ||
    path.startsWith('/transactions') ||
    path === '/review' ||
    path === '/income' ||
    path === '/analytics'
  const reviewCount = inPeriod(app.displayTransactions, app.dateRange).filter(
    t => t.category !== 'Transfer' && needsReview(t),
  ).length

  // In the order a month's books get balanced: bring the data in, clear what doesn't belong or is unsorted, then report
  const COLLECT = 'Collect'
  const BALANCE = 'Balance the month'
  const INSIGHTS = 'Insights'
  const nav: AppShellNavItem[] = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
    {
      to: '/banks',
      label: 'Banks',
      icon: Landmark,
      badge: attention,
      hidden: !banking?.enabled,
      group: COLLECT,
    },
    { to: '/transactions', label: 'Transactions', icon: List, group: COLLECT },
    {
      to: '/trips',
      label: 'Trips',
      icon: Plane,
      hidden: !banking?.enabled,
      group: BALANCE,
    },
    {
      to: '/review',
      label: 'Review',
      icon: Inbox,
      badge: reviewCount,
      group: BALANCE,
    },
    { to: '/income', label: 'Income', icon: Wallet, group: BALANCE },
    { to: '/analytics', label: 'Analytics', icon: PieChart, group: INSIGHTS },
    { to: '/budgets', label: 'Budgets', icon: Target, group: INSIGHTS },
    {
      to: '/contracts',
      label: 'Recurring payments',
      icon: Repeat,
      hidden: !banking?.enabled,
      group: INSIGHTS,
    },
    { to: '/guide/start', label: 'Guide', icon: BookOpen, group: 'Setup' },
    { to: '/settings', label: 'Settings', icon: Settings, group: 'Setup' },
  ]

  const closeNav = () => setNavOpen(false)

  return (
    <div className="min-h-screen bg-midnight-950 md:flex">
      <StoredBankTransactions />
      <aside className="hidden md:block w-60 shrink-0 border-r border-midnight-800 bg-midnight-900/60 sticky top-0 h-screen">
        <AppShellSidebar nav={nav} />
      </aside>
      {/* The phone menu: a Radix dialog slid in from the left, so focus stays inside it and Escape closes it */}
      <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="md:hidden fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="md:hidden fixed inset-y-0 left-0 z-50 w-64 border-r border-midnight-800 bg-midnight-900 outline-none"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Close
              className="absolute top-4 right-3 p-1.5 text-midnight-400 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
            <AppShellSidebar nav={nav} onNavigate={closeNav} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:sticky top-0 z-40 border-b border-midnight-800 bg-midnight-900/80 backdrop-blur-sm">
          <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              className="md:hidden p-2 -ml-2 text-midnight-300"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-2 max-md:order-last max-md:w-full max-md:justify-end">
              {app.pendingSaves > 0 && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-midnight-400" aria-live="polite">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                </span>
              )}
              {hasData && followsPeriod && (
                <PeriodPicker
                  dateRange={app.dateRange}
                  onChange={app.setDateRange}
                  transactions={app.displayTransactions}
                />
              )}
              {hasData && (
                <Tooltip label={app.anonymizationEnabled ? 'Click to show original data' : 'Click to anonymize data'}>
                  <button
                    onClick={app.toggleAnonymization}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      app.anonymizationEnabled
                        ? 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30'
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                    }`}
                  >
                    {app.anonymizationEnabled ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                    <span className="hidden lg:inline">{app.anonymizationEnabled ? 'Anonymized' : 'Original'}</span>
                  </button>
                </Tooltip>
              )}
              {hasData && (
                <Tooltip label="Add another file">
                  <label className="btn-secondary text-sm flex items-center gap-2 cursor-pointer">
                    <FilePlus className="w-4 h-4" />
                    <span className="hidden lg:inline">Add file</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.ofx,.qfx"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]

                        if (file) {
                          app.addFile(file)
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                </Tooltip>
              )}
              <HeaderMenu
                hasData={hasData}
                numberFormatLabel={app.numberFormat === 'point' ? '1,234.56' : '1.234,56'}
                onToggleNumberFormat={app.toggleNumberFormat}
                remember={app.remember}
                onToggleRemember={app.toggleRemember}
                onDownloadCsv={app.downloadCsv}
                onClear={app.clearData}
              />
            </div>
          </div>
        </header>

        <main className={`flex-1 px-4 sm:px-6 py-6 max-md:pb-24 w-full mx-auto ${wide ? 'max-w-none' : 'max-w-6xl'}`}>
          {banking?.enabled && (
            <BankBanners
              connections={connections}
              onReconnect={c =>
                reconnect.mutate({
                  bank: c.bank,
                  country: c.country,
                  reconnect: c.id,
                })
              }
            />
          )}
          <Outlet />
        </main>

        <nav
          aria-label="Quick"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-midnight-800 bg-midnight-900/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom,0px)]"
        >
          <ul className="flex">
            {nav
              .filter(n => ['/', '/transactions', '/review', '/banks'].includes(n.to) && !n.hidden)
              .slice(0, 4)
              .map(item => (
                <li key={item.to} className="flex-1">
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.exact }}
                    className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] text-midnight-400"
                    activeProps={{ className: '!text-accent' }}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    {!!item.badge && (
                      <span className="absolute top-1 left-1/2 ml-2 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-semibold text-midnight-950 text-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            <li className="flex-1">
              <button
                onClick={() => setNavOpen(true)}
                className="w-full flex flex-col items-center gap-0.5 py-2 text-[11px] text-midnight-400"
              >
                <Menu className="w-5 h-5" />
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
