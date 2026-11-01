import { Link } from '@tanstack/react-router'
import ExportPreview from '../components/ExportPreview'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { inPeriod } from '@/shared/utils/summary'

export default function ExportPage() {
  const app = useApp()
  const rows = inPeriod(app.displayTransactions, app.dateRange).filter(t => t.category !== 'Transfer')
  return (
    <div>
      <PageHeader
        title="Export"
        description="Copy a row for your Google Sheet."
        actions={
          <Link to="/settings/sheet" className="btn-secondary text-sm">
            Sheet settings
          </Link>
        }
      />
      <ExportPreview transactions={rows} sheetConfig={app.sheetConfig} />
    </div>
  )
}
