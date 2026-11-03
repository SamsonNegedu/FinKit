import { useSearch } from '@tanstack/react-router'
import TabLinks from '@/shared/components/forms/TabLinks'
import BackOfficePanel from '@/features/banking/components/banks/BackOfficePanel'
import CategoriesPanel from '@/features/settings/components/CategoriesPanel'
import SettingsPanel from '@/features/settings/components/SettingsPanel'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { BackOfficeSearch } from '@/features/banking/constants/search.constants'
import { useBankingStatus } from '@/features/banking/hooks/banking-queries'

type Section = 'sheet' | 'categories' | 'columns' | 'rules' | 'back-office'

export default function SettingsPage({ section }: { section: Section }) {
  const app = useApp()
  const { data: banking } = useBankingStatus()
  const tabs: Array<[Section, string]> = [
    ['sheet', 'Google Sheet'],
    ['categories', 'Categories'],
    ['columns', 'Columns'],
    ['rules', 'Learned rules'],
    ...(banking?.enabled ? ([['back-office', 'Back office']] as Array<[Section, string]>) : []),
  ]

  return (
    <div>
      <PageHeader title="Settings" />
      <TabLinks
        ariaLabel="Settings sections"
        className="mb-6"
        links={tabs.map(([id, label]) => ({ label, link: { to: `/settings/${id}` }, active: section === id }))}
      />
      {section === 'back-office' ? (
        <BackOffice />
      ) : section === 'categories' ? (
        <CategoriesPanel />
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
