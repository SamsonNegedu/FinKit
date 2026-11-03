import { RefreshCw } from 'lucide-react'
import Tooltip from '@/shared/components/Tooltip'

interface RecurringBadgeProps {
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
}

const LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' }

/** A quiet icon rather than a pill: in a list of subscriptions every row is recurring, so a pill is only noise. */
export default function RecurringBadge({ frequency }: RecurringBadgeProps) {
  const label = frequency ? LABELS[frequency] : 'Recurring'

  return (
    <Tooltip label={`Recurring · ${label.toLowerCase()}`}>
      <span role="img" aria-label={`Recurring, ${label.toLowerCase()}`} className="p-1 text-accent/70">
        <RefreshCw className="w-3.5 h-3.5" />
      </span>
    </Tooltip>
  )
}
