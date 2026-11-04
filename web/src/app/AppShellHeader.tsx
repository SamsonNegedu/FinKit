import { Menu, Shield, Loader2 } from 'lucide-react'
import type { RefObject } from 'react'
import Breadcrumbs from '@/shared/components/layout/Breadcrumbs'
import HeaderMenu from '@/shared/components/layout/HeaderMenu'
import PeriodPicker from '@/shared/components/layout/PeriodPicker'
import Tooltip from '@/shared/components/Tooltip'
import type { DateRange, Transaction } from '@/shared/types'

export default function AppShellHeader({
  onOpenNav,
  followsPeriod,
  hasData,
  pendingSaves,
  dateRange,
  transactions,
  onDateRangeChange,
  anonymizationEnabled,
  onToggleAnonymization,
  onAddFileClick,
  onFilePicked,
  numberFormatLabel,
  onToggleNumberFormat,
  remember,
  onToggleRemember,
  onDownloadCsv,
  onClear,
  fileInputRef,
}: {
  onOpenNav: () => void
  followsPeriod: boolean
  hasData: boolean
  pendingSaves: number
  dateRange: DateRange | null
  transactions: Transaction[]
  onDateRangeChange: (range: DateRange | null) => void
  anonymizationEnabled: boolean
  onToggleAnonymization: () => void
  onAddFileClick: () => void
  onFilePicked: (file: File) => void
  numberFormatLabel: string
  onToggleNumberFormat: () => void
  remember: boolean
  onToggleRemember: () => void
  onDownloadCsv: () => void
  onClear: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <header className="md:sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-sm">
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button className="md:hidden p-2 -ml-2 text-midnight-300" aria-label="Open navigation" onClick={onOpenNav}>
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <Breadcrumbs />
        </div>
        {/* With a period picker the controls take their own row on a phone; without one they stay beside the title */}
        <div
          className={`flex items-center gap-2 ${hasData && followsPeriod ? 'max-md:order-last max-md:w-full max-md:justify-end' : ''}`}
        >
          {pendingSaves > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-midnight-400" aria-live="polite">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </span>
          )}
          {hasData && followsPeriod && (
            <PeriodPicker dateRange={dateRange} onChange={onDateRangeChange} transactions={transactions} />
          )}
          {hasData && anonymizationEnabled && (
            <Tooltip label="Show the original amounts">
              <button
                onClick={onToggleAnonymization}
                className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/15 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/25"
                aria-pressed
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Anonymized</span>
              </button>
            </Tooltip>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.ofx,.qfx"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]

              if (file) {
                onFilePicked(file)
              }
              e.target.value = ''
            }}
          />
          <HeaderMenu
            hasData={hasData}
            anonymized={anonymizationEnabled}
            onToggleAnonymization={onToggleAnonymization}
            onAddFile={onAddFileClick}
            numberFormatLabel={numberFormatLabel}
            onToggleNumberFormat={onToggleNumberFormat}
            remember={remember}
            onToggleRemember={onToggleRemember}
            onDownloadCsv={onDownloadCsv}
            onClear={onClear}
          />
        </div>
      </div>
    </header>
  )
}
