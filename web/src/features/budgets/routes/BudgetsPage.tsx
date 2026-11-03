import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { suggestLimit } from '../utils/budgetProgress'
import BudgetSetupDialog from '../components/BudgetSetupDialog'
import BudgetDialog from '../components/BudgetDialog'
import BudgetCapDialog from '../components/BudgetCapDialog'
import BudgetSummary from '../components/BudgetSummary'
import BudgetCapCard from '../components/BudgetCapCard'
import BudgetSpendSection from '../components/BudgetSpendSection'
import BudgetUnbudgetedSection from '../components/BudgetUnbudgetedSection'
import MonthSwitcher from '../components/MonthSwitcher'
import { useBudgets, useDeleteBudget, useDeleteCap, useSaveBudget, useSaveCap } from '../hooks/budgets-queries'
import { useBudgetsPageData } from '../hooks/useBudgetsPageData'
import { monthKey } from '../utils/budgetProgress'

/** Monthly limits per category. The limits live on the server; spending is worked out here from your transactions. */
export default function BudgetsPage() {
  const { displayTransactions, baseCurrency } = useApp()
  const navigate = useNavigate()
  const { data, isLoading, error } = useBudgets()
  const limits = data?.budgets ?? []
  const caps = data?.caps ?? []
  const save = useSaveBudget()
  const remove = useDeleteBudget()
  const saveCap = useSaveCap()
  const removeCap = useDeleteCap()
  const [capOpen, setCapOpen] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [setup, setSetup] = useState(false)
  const model = useBudgetsPageData(displayTransactions, baseCurrency, limits, caps)

  const toCategory = (category: string) => navigate({ to: '/transactions', search: { cat: [category] } })
  const put = (category: string, amount: number, rollover?: boolean) => {
    const existing = limits.find(l => l.category === category && l.currency === baseCurrency)

    return save.mutateAsync({
      category,
      currency: baseCurrency,
      amount,
      rollover: rollover ?? existing?.rollover ?? false,
      startsMonth: existing?.startsMonth ?? monthKey(model.thisMonth.year, model.thisMonth.month),
    })
  }
  const failure = (save.error ?? remove.error ?? saveCap.error ?? removeCap.error ?? error)?.message

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="A monthly limit per category. Spending is counted from your transactions, the same way as in Analytics."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <MonthSwitcher value={model.view} min={model.earliest} max={model.thisMonth} onChange={model.setView} />
            <button className="btn-primary flex items-center gap-1.5" onClick={() => setAdding('')}>
              <Plus className="h-4 w-4" /> Add budget
            </button>
          </div>
        }
      />
      {failure && !adding && !capOpen && <p className="text-sm text-negative">{failure}</p>}
      {model.spendRows.length > 0 && (
        <BudgetSummary
          totals={model.totals}
          currency={baseCurrency}
          paceAt={model.capPace}
          previous={model.previous}
          onSetCap={model.cap ? undefined : () => setCapOpen(true)}
        />
      )}
      {model.cap && (
        <BudgetCapCard
          cap={model.cap}
          currency={baseCurrency}
          paceAt={model.capPace}
          onEdit={() => setCapOpen(true)}
          onRemove={() => removeCap.mutate(baseCurrency)}
        />
      )}
      {isLoading ? null : model.rows.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-midnight-400">
            No budgets yet. Set them up from your spending, or add one to see how this month is going.
          </p>
          {model.suggestions.length > 0 && (
            <button className="btn-secondary" onClick={() => setSetup(true)}>
              Set up from my spending
            </button>
          )}
        </div>
      ) : (
        <BudgetSpendSection
          many={model.many}
          search={model.search}
          onSearchChange={model.setSearch}
          filter={model.filter}
          onFilterChange={model.setFilter}
          spendCount={model.spendRows.length}
          shownCount={model.shown.length}
          fold={model.fold}
          showOk={model.showOk}
          onToggleShowOk={() => model.setShowOk(v => !v)}
          attention={model.attention}
          onTrack={model.onTrack}
          shown={model.shown}
          goalRows={model.goalRows}
          history={model.history}
          removePending={remove.isPending}
          onOpenCategory={toCategory}
          onChangeAmount={(row, amount) => void put(row.category, amount).catch(() => undefined)}
          onRemove={row => remove.mutate(row)}
          onToggleRollover={row => void put(row.category, row.base, !row.rollover).catch(() => undefined)}
        />
      )}
      <BudgetUnbudgetedSection
        open={model.open}
        isCurrent={model.isCurrent}
        monthLabel={model.monthLabel}
        currency={baseCurrency}
        showSuggestLink={model.suggestions.length > 0 && model.rows.length > 0}
        onSuggest={() => setSetup(true)}
        onSetBudget={category => setAdding(category)}
      />
      {setup && (
        <BudgetSetupDialog
          suggestions={model.suggestions}
          currency={baseCurrency}
          busy={save.isPending}
          error={failure}
          onSave={picked => Promise.all(picked.map(p => put(p.category, p.amount))).then(() => setSetup(false))}
          onClose={() => setSetup(false)}
        />
      )}
      {capOpen && (
        <BudgetCapDialog
          current={model.cap?.cap ?? null}
          currency={baseCurrency}
          suggested={model.budgetedTotal}
          busy={saveCap.isPending}
          error={failure}
          onSave={amount => saveCap.mutateAsync({ currency: baseCurrency, amount })}
          onClose={() => setCapOpen(false)}
        />
      )}
      {adding !== null && (
        <BudgetDialog
          key={adding}
          categories={model.choices}
          initial={adding}
          currency={baseCurrency}
          suggest={c => suggestLimit(displayTransactions, c, model.view.year, model.view.month)}
          busy={save.isPending}
          error={failure}
          onSave={(category, amount, rollover) => put(category, amount, rollover)}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  )
}
