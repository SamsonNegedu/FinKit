import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Copy } from 'lucide-react'
import Select from '@/shared/components/forms/Select'
import { useApp } from '@/shared/contexts/AppState'
import { latestCompleteMonth, monthGroups, monthsTsv, monthTsv } from '@/shared/utils/analysis/sheetYear'
import { incomeGaps } from '@/shared/utils/analysis/incomeGaps'
import { formatCurrency } from '@/shared/utils/format'
import { getLayout } from '@/shared/utils/sheetLayout'
import YearTable from './YearTable'

const monthName = (key: string) =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5)) - 1, 1).toLocaleDateString('en-US', { month: 'long' })

/** Your year: every month in the columns of the export sheet, for one year at a time. It ignores the period picker. */
export default function YearView() {
  const app = useApp()
  const months = useMemo(() => monthGroups(app.displayTransactions), [app.displayTransactions])
  const layout = useMemo(() => getLayout(app.sheetConfig), [app.sheetConfig])
  const years = useMemo(() => [...new Set(months.map(m => m.year))].sort((a, b) => b - a), [months])
  const [chosen, setChosen] = useState<number | null>(null)
  const year = chosen !== null && years.includes(chosen) ? chosen : years[0]

  const inYear = useMemo(() => months.filter(m => m.year === year), [months, year])
  // Reconciling is usually one month at a time, the one that just ended: a month still in progress is only half a row
  const [thisMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const latest = latestCompleteMonth(inYear, thisMonth)
  const [copied, setCopied] = useState<'latest' | 'all' | null>(null)
  const copy = async (what: 'latest' | 'all', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }
  const gaps = useMemo(() => incomeGaps(months).filter(g => g.key.startsWith(`${year}-`)), [months, year])

  if (years.length === 0) {
    return <p className="text-midnight-400">No transactions yet.</p>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-midnight-400">
          Month by month, in the columns of your sheet. Copy a month to paste into it: the button copies the latest, and
          each row has its own.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => copy('all', monthsTsv(inYear, layout))}
            className="text-sm text-midnight-400 underline-offset-2 hover:text-ink hover:underline"
          >
            {copied === 'all' ? 'Copied!' : `Copy all ${inYear.length} rows`}
          </button>
          <Link to="/settings/sheet" className="btn-secondary text-sm">
            Sheet settings
          </Link>
          {latest && (
            <button
              onClick={() => copy('latest', monthTsv(latest, layout))}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {copied === 'latest' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'latest' ? 'Copied!' : `Copy ${monthName(latest.key)} row`}
            </button>
          )}
          {years.length > 1 && (
            <Select
              ariaLabel="Year"
              className="w-28"
              value={String(year)}
              onChange={y => setChosen(Number(y))}
              options={years.map(y => ({ value: String(y), label: String(y) }))}
            />
          )}
        </div>
      </div>
      {gaps.length > 0 && (
        <ul className="mb-4 space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {gaps.map(g => (
            <li key={g.key} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                No income counted in {monthName(g.key)}.
                {g.suggestion &&
                  ` A ${formatCurrency(g.suggestion.tx.amount, app.baseCurrency)} payment on ${g.suggestion.tx.date} may belong to it.`}
              </span>
              {g.suggestion && (
                <button
                  className="btn-secondary text-xs"
                  onClick={() => {
                    const tx = g.suggestion!.tx

                    app.updateTransaction(tx.id, { countsToMonth: g.key, countsToMonthSource: 'manual' })
                    app.pushToast({
                      message: `Counting the ${tx.date} payment in ${monthName(g.key)}`,
                      tone: 'success',
                      actionLabel: 'Undo',
                      onAction: () =>
                        app.updateTransaction(tx.id, { countsToMonth: undefined, countsToMonthSource: undefined }),
                    })
                  }}
                >
                  Count it in {monthName(g.key)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <YearTable months={inYear} year={year} layout={layout} currency={app.baseCurrency} />
    </div>
  )
}
