import { BankConnection } from '@/features/banking/api/banking.api'

const STYLE: Record<BankConnection['status'], string> = {
  active: 'bg-income/15 text-positive',
  expiring: 'bg-warning/15 text-warning',
  expired: 'bg-negative/15 text-negative',
}

function connectionStatusLabel(connection: BankConnection): string {
  if (connection.status === 'active') {
    return 'Active'
  }
  if (connection.status === 'expiring') {
    return `Expires in ${connection.daysLeft} days`
  }

  return 'Expired'
}

export default function StatusPill({ connection }: { connection: BankConnection }) {
  const label = connectionStatusLabel(connection)

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STYLE[connection.status]}`}>
      {label}
    </span>
  )
}
