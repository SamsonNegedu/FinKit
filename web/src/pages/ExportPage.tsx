import { Link } from '@tanstack/react-router'
import ExportPreview from '../components/ExportPreview'
import { useApp } from '../app/AppState'
import PageHeader from '../app/PageHeader'
import { inPeriod } from '../lib/summary'

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
