import { Link, useSearch } from '@tanstack/react-router'
import BackOfficePanel from '@/features/banking/components/banks/BackOfficePanel'
import SettingsPanel from '@/features/settings/components/SettingsPanel'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { BackOfficeSearch } from '@/features/banking/constants/search.constants'
import { useBankingStatus } from '@/features/banking/hooks/banking-queries'

type Section = 'sheet' | 'columns' | 'rules' | 'back-office'

export default function SettingsPage({ section }: { section: Section }) {
  const app = useApp()
  const { data: banking } = useBankingStatus()
  const tabs: Array<[Section, string]> = [
    ['sheet', 'Google Sheet'],
    ['columns', 'Columns'],
    ['rules', 'Learned rules'],
    ...(banking?.enabled ? ([['back-office', 'Back office']] as Array<[Section, string]>) : []),
  ]

  return (
    <div>
      <PageHeader title="Settings" />
      <div
        className="flex gap-1 border-b border-midnight-700 mb-6 overflow-x-auto overflow-y-hidden"
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            to={`/settings/${id}`}
            role="tab"
            aria-selected={section === id}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${section === id ? 'border-accent text-white' : 'border-transparent text-midnight-400 hover:text-midnight-200'}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {section === 'back-office' ? (
        <BackOffice />
      ) : (
        <SettingsPanel config={app.sheetConfig} onSave={app.setSheetConfig} section={section} />
      )}
    </div>
  )
}

function BackOffice() {
  const { section } = useSearch({ from: '/settings/back-office' }) as BackOfficeSearch

  return <BackOfficePanel section={section ?? 'overview'} />
}
