import CategoryIcon from '@/shared/components/CategoryIcon'
import Tooltip from '@/shared/components/Tooltip'
import { useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Check, Pencil, X } from 'lucide-react'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import MakeRuleDialog from '@/shared/components/transactions/MakeRuleDialog'
import { displayNameOf } from '@/shared/utils/aliases'
import { getAvailableCategories, merchantKeyOf, sameMerchant } from '@/shared/utils/categorizer'
import { formatDay } from '@/shared/utils/dates'
import { formatCurrency } from '@/shared/utils/format'
import { inPeriod } from '@/shared/utils/summary'
import TransactionList from './TransactionList'
import Select from '@/shared/components/forms/Select'

/** Everything about one merchant: what you spent, where it came from, and its category rule. */
export default function MerchantPage() {
  const app = useApp()
  const { merchantKey } = useParams({ from: '/transactions/merchants/$merchantKey' })
  const [renaming, setRenaming] = useState(false)
  const [ruleOpen, setRuleOpen] = useState(false)

  const rows = useMemo(
    () => inPeriod(app.displayTransactions, app.dateRange).filter(t => sameMerchant(merchantKeyOf(t), merchantKey)),
    [app.displayTransactions, app.dateRange, merchantKey],
  )

  if (rows.length === 0) {
    return (
      <div className="card text-center space-y-3 py-10">
        <p className="text-ink font-medium">No transactions for this merchant in the chosen period.</p>
        <p className="text-sm text-midnight-400">Change the period at the top, or go back to all merchants.</p>
        <Link to="/transactions" search={{ view: 'merchants' }} className="btn-secondary inline-block">
          All merchants
        </Link>
      </div>
    )
  }

  const name = displayNameOf(rows[0])
  const spent = rows.filter(t => t.type === 'expense' && !t.isExcluded)
  const total = spent.reduce((s, t) => s + t.amount, 0)
  const categories = [...new Set(rows.map(t => t.category || 'Other'))]
  const category = categories.length === 1 ? categories[0] : undefined
  const details = category ? (app.categoryList.details?.[category] ?? []) : []
  const sameDetail = rows.every(t => (t.categoryDetail ?? '') === (rows[0].categoryDetail ?? ''))
  const detail = sameDetail ? (rows[0].categoryDetail ?? '') : ''
  const sources = [...new Set(rows.map(t => t.bankName ?? 'Imported files'))]
  const dates = rows.map(t => t.date).sort()

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description={`${rows.length} transaction${rows.length === 1 ? '' : 's'} · ${formatDay(dates[0])} – ${formatDay(dates[dates.length - 1])}`}
        actions={
          renaming ? (
            <form
              className="flex items-center gap-2"
              onSubmit={e => {
                e.preventDefault()
                app.renameMerchant(merchantKey, new FormData(e.currentTarget).get('name') as string)
                setRenaming(false)
              }}
            >
              <input name="name" defaultValue={name} aria-label="Display name" className="input py-1.5 text-sm w-56" />
              <button type="submit" className="btn-primary p-2" aria-label="Save name">
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="btn-secondary p-2"
                aria-label="Cancel"
                onClick={() => setRenaming(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <Tooltip label="Only changes how it's shown">
              <button className="btn-secondary text-sm flex items-center gap-2" onClick={() => setRenaming(true)}>
                <Pencil className="w-4 h-4" /> Rename
              </button>
            </Tooltip>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Fact label="Spent" value={formatCurrency(total, app.baseCurrency)} />
        <Fact label="Average" value={spent.length ? formatCurrency(total / spent.length, app.baseCurrency) : '-'} />
        <Fact label="From" value={sources.join(', ')} />
      </div>

      <section className="card !p-4" aria-label="Category for every transaction">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-44 flex-1">
            <label htmlFor="merchant-category" className="block text-xs text-midnight-400 mb-1">
              Category for all {rows.length} transactions
            </label>
            <div className="flex items-center gap-2">
              {category && <CategoryIcon category={category} size="sm" />}
              <Select
                id="merchant-category"
                className="py-1 text-sm w-full"
                value={category ?? ''}
                onChange={value =>
                  value &&
                  app.bulkUpdate(
                    rows.map(t => t.id),
                    { category: value, categoryDetail: undefined },
                  )
                }
                options={[
                  ...(category ? [] : [{ value: '', label: 'Mixed', disabled: true }]),
                  // The one it has now stays listed even if it has been archived, so the box is never blank
                  ...[...new Set([...(category ? [category] : []), ...getAvailableCategories()])].map(c => ({
                    value: c,
                    label: c,
                  })),
                ]}
              />
            </div>
          </div>
          {category && (
            <div className="min-w-44 flex-1">
              <label htmlFor="merchant-detail" className="block text-xs text-midnight-400 mb-1">
                Subcategory
              </label>
              <Select
                id="merchant-detail"
                className="py-1 text-sm w-full"
                value={detail}
                onChange={value =>
                  app.bulkUpdate(
                    rows.map(t => t.id),
                    { category, categoryDetail: value || undefined },
                  )
                }
                options={[
                  { value: '', label: 'No subcategory' },
                  ...[...new Set([...(detail ? [detail] : []), ...details])].map(d => ({ value: d, label: d })),
                ]}
              />
            </div>
          )}
          <button className="btn-secondary text-sm" onClick={() => setRuleOpen(true)}>
            Create a rule…
          </button>
        </div>
        <p className="mt-2 text-[11px] text-midnight-500">
          Changes all of this merchant's rows and teaches FinKit for future ones. A rule can be narrower.
        </p>
      </section>

      <TransactionList transactions={rows} viewMode="list" />
      {ruleOpen && (
        <MakeRuleDialog
          tx={rows[0]}
          category={category ?? rows[0].category ?? 'Other'}
          detail={detail || undefined}
          currency={app.baseCurrency}
          onSave={match => app.makeRule(match, category ?? rows[0].category ?? 'Other', detail || undefined)}
          onClose={() => setRuleOpen(false)}
        />
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="card !p-4">
      <p className="text-xs text-midnight-400">{label}</p>
      <p className="text-lg font-semibold text-ink truncate" title={value}>
        {value}
      </p>
    </div>
  )
}
