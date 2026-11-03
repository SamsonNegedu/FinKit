import { BUDGET_COLUMNS } from './budgetColumns'

/** Column headings over a list of budgets, lined up with the rows. Hidden on a phone, where a row names its own parts. */
export default function BudgetListHead({ labels }: { labels: [string, string, string, string, string] }) {
  return (
    <div aria-hidden="true" className={`hidden gap-x-4 pb-1 text-xs text-midnight-500 sm:grid ${BUDGET_COLUMNS}`}>
      <span>Category</span>
      <span>{labels[0]}</span>
      <span className="text-right">{labels[1]}</span>
      <span className="text-right">{labels[2]}</span>
      <span className="text-right">{labels[3]}</span>
      <span className="text-right">{labels[4]}</span>
      <span />
    </div>
  )
}
