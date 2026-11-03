import CategoryIcon from '@/shared/components/CategoryIcon'
import { formatCurrency } from '@/shared/utils/format'

export default function BudgetUnbudgetedSection({
  open,
  isCurrent,
  monthLabel,
  currency,
  showSuggestLink,
  onSuggest,
  onSetBudget,
}: {
  open: Array<{ category: string; spent: number }>
  isCurrent: boolean
  monthLabel: string
  currency: string
  showSuggestLink: boolean
  onSuggest: () => void
  onSetBudget: (category: string) => void
}) {
  if (open.length === 0) {
    return null
  }

  return (
    <section className="card space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-midnight-400">
          Spent {isCurrent ? 'this month' : `in ${monthLabel}`} with no budget
        </h2>
        {showSuggestLink && (
          <button className="text-sm text-positive hover:underline" onClick={onSuggest}>
            Suggest limits for these
          </button>
        )}
      </div>
      <ul className="divide-y divide-line">
        {open.map(o => (
          <li key={o.category} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="flex items-center gap-2 text-ink">
              <CategoryIcon category={o.category} size="sm" />
              {o.category}
            </span>
            <span className="flex items-center gap-3 tabular-nums text-midnight-300">
              {formatCurrency(o.spent, currency)}
              <button className="text-positive hover:underline" onClick={() => onSetBudget(o.category)}>
                Set budget
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
