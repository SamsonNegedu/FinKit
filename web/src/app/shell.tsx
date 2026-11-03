import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { X } from 'lucide-react'
import BankBanners from '@/features/banking/components/BankBanners'
import StoredBankTransactions from '@/features/banking/components/StoredBankTransactions'
import { needsReview } from '@/features/review/components/ReviewQueue'
import { inPeriod } from '@/shared/utils/summary'
import { useBankingStatus, useConnections, useStartConnect } from '@/features/banking/hooks/banking-queries'
import { useApp } from '@/shared/contexts/AppState'
import AppShellSidebar from './AppShellSidebar'
import AppShellHeader from './AppShellHeader'
import MobileQuickNav from './MobileQuickNav'
import { useAppShellNav } from './useAppShellNav'

export default function AppShell() {
  const app = useApp()
  const { data: banking } = useBankingStatus()
  const { data: connections = [] } = useConnections()
  const reconnect = useStartConnect()
  const [navOpen, setNavOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasData = app.transactions.length > 0
  const attention = connections.filter(c => c.status !== 'active').length
  const path = useRouterState({ select: s => s.location.pathname }).replace(/^\/app/, '') || '/'
  const wide = path.startsWith('/analytics')
  const followsPeriod =
    path === '/' ||
    path.startsWith('/transactions') ||
    path === '/review' ||
    path === '/income' ||
    path === '/analytics'
  const reviewCount = inPeriod(app.displayTransactions, app.dateRange).filter(
    t => t.category !== 'Transfer' && needsReview(t),
  ).length
  const nav = useAppShellNav(!!banking?.enabled, attention, reviewCount)
  const closeNav = () => setNavOpen(false)

  return (
    <div className="min-h-screen bg-surface-page md:flex">
      <StoredBankTransactions />
      <aside className="hidden md:block w-60 shrink-0 border-r border-line bg-surface/60 sticky top-0 h-screen">
        <AppShellSidebar nav={nav} />
      </aside>
      <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="md:hidden fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="md:hidden fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-surface outline-none"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Close
              className="absolute top-4 right-3 p-1.5 text-midnight-400 hover:text-ink"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
            <AppShellSidebar nav={nav} onNavigate={closeNav} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex-1 min-w-0 flex flex-col">
        <AppShellHeader
          onOpenNav={() => setNavOpen(true)}
          followsPeriod={followsPeriod}
          hasData={hasData}
          pendingSaves={app.pendingSaves}
          dateRange={app.dateRange}
          transactions={app.displayTransactions}
          onDateRangeChange={app.setDateRange}
          anonymizationEnabled={app.anonymizationEnabled}
          onToggleAnonymization={app.toggleAnonymization}
          onAddFileClick={() => fileInputRef.current?.click()}
          onFilePicked={file => app.addFile(file)}
          numberFormatLabel={app.numberFormat === 'point' ? '1,234.56' : '1.234,56'}
          onToggleNumberFormat={app.toggleNumberFormat}
          remember={app.remember}
          onToggleRemember={app.toggleRemember}
          onDownloadCsv={app.downloadCsv}
          onClear={app.clearData}
          fileInputRef={fileInputRef}
        />

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

        <MobileQuickNav nav={nav} onOpenNav={() => setNavOpen(true)} />
      </div>
    </div>
  )
}
