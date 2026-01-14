import { RefreshCw } from 'lucide-react'

interface RecurringBadgeProps {
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
}

export default function RecurringBadge({ frequency }: RecurringBadgeProps) {
  const label = frequency ? {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  }[frequency] : 'Recurring'

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent text-xs font-medium rounded-full">
      <RefreshCw className="w-3 h-3" />
      {label}
    </span>
  )
}
