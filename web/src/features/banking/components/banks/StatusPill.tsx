import { BankConnection } from '@/features/banking/api/banking.api'

const STYLE: Record<BankConnection['status'], string> = {
  active: 'bg-income/15 text-emerald-300',
  expiring: 'bg-amber-500/15 text-amber-300',
  expired: 'bg-red-500/15 text-red-300',
}

export default function StatusPill({ connection }: { connection: BankConnection }) {
  const label =
    connection.status === 'active'
      ? 'Active'
      : connection.status === 'expiring'
        ? `Expires in ${connection.daysLeft} days`
        : 'Expired'

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STYLE[connection.status]}`}>
      {label}
    </span>
  )
}
