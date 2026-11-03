import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '@/shared/contexts/AppState'
import PageHeader from '@/shared/components/layout/PageHeader'
import { formatCurrency } from '@/shared/utils/format'
import { merchantKeyOf, sameMerchant } from '@/shared/utils/categorizer'
import type { Contract } from '../api/contracts.api'
import ContractDialog, { toNew, type Draft } from '../components/ContractDialog'
import ContractRow from '../components/ContractRow'
import ContractsFromUploads from '../components/ContractsFromUploads'
import ContractsInsights from '../components/ContractsInsights'
import ContractsSummary from '../components/ContractsSummary'
import { useContracts, useCreateContract, useDeleteContract, useUpdateContract } from '../hooks/contracts-queries'
import { combineTotals, insightsOf } from '../utils/contractInsights'
import { groupContracts } from '../utils/contractGroups'
import { uploadCandidates, type UploadCandidate } from '../utils/uploadCandidates'

type Dialog = { kind: 'add' } | { kind: 'edit'; contract: Contract } | null

/** Payments that repeat on a steady rhythm: the monthly costs you cannot easily skip. */
export default function ContractsPage() {
  const { baseCurrency, bulkUpdate, transactions, rates, pushToast } = useApp()
  const { data, isLoading, error } = useContracts()
  const create = useCreateContract()
  const update = useUpdateContract()
  const remove = useDeleteContract()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [showEnded, setShowEnded] = useState(false)
  // Fixed for the visit: "coming up" is measured from when the page opened
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const currency = baseCurrency
  // One total in your base currency using the rates from Settings; a currency without a rate is listed apart
  const { combined, unconverted } = combineTotals(data?.totals ?? [], currency, rates)
  const toBase = (monthly: number, from: string) =>
    from === currency ? monthly : rates[from] > 0 ? monthly * rates[from] : null
  const { groups, ended, dismissed } = groupContracts(data?.contracts ?? [], toBase)
  const candidates = uploadCandidates(transactions, data?.contracts ?? [])
  const insights = insightsOf(data?.contracts ?? [], today, currency)
  const suggested = groups.flatMap(g => g.contracts).filter(c => c.groupSource === 'suggested').length
  const max = Math.max(1, ...(data?.contracts ?? []).map(c => c.monthly))
  const row = (c: Contract) => (
    <ContractRow key={c.id} contract={c} max={max} onOpen={() => setDialog({ kind: 'edit', contract: c })} />
  )
  // The server keeps the category as your rule for the payee. The transaction list follows through the same
  // path as recategorizing there (it spares anything you categorized by hand, says what changed, offers Undo)
  const followInTransactions = (c: Contract, category: string) => {
    const ids = c.payee ? transactions.filter(t => sameMerchant(merchantKeyOf(t), c.payee!)).map(t => t.id) : []

    if (ids.length > 0) {
      bulkUpdate(ids, { category })
    }
  }
  const addFromUpload = (c: UploadCandidate) =>
    create.mutate(
      {
        name: c.name,
        group: c.category,
        amount: c.amount,
        currency: c.currency,
        frequency: c.frequency,
        kind: 'fixed',
        startDate: c.lastDate,
        note: 'Added from an uploaded file',
      },
      { onSuccess: () => pushToast({ message: `Added ${c.name} to recurring payments`, tone: 'success' }) },
    )
  const setState = (c: Contract, state: 'confirmed' | 'dismissed' | 'detected') =>
    update
      // Confirming a suggested category makes it your rule, so you are not asked again
      .mutateAsync({
        id: c.id,
        changes: { state, ...(state === 'confirmed' && c.groupSource === 'suggested' ? { group: c.group } : {}) },
      })
      .then(() => {
        if (state === 'confirmed' && c.groupSource === 'suggested') {
          followInTransactions(c, c.group)
        }
        pushToast({
          message:
            state === 'confirmed'
              ? 'Marked as recurring'
              : state === 'dismissed'
                ? 'Marked as not recurring'
                : 'Recurring payment restored',
          tone: 'success',
        })
        setDialog(null)
      })

  const save = async (d: Draft) => {
    if (dialog?.kind === 'edit') {
      const c = dialog.contract

      await update.mutateAsync({
        id: c.id,
        changes: {
          name: d.name.trim(),
          // A new category is remembered as your rule for this payee; leaving a suggestion alone keeps it a suggestion
          ...(d.group !== c.group ? { group: d.group } : {}),
          note: d.note.trim() || null,
          kmPerYear: d.kmPerYear ? Number(d.kmPerYear) : null,
        },
      })
      if (d.group !== c.group) {
        followInTransactions(c, d.group)
      }
    } else {
      await create.mutateAsync(toNew(d, currency))
    }
    pushToast({ message: dialog?.kind === 'edit' ? 'Saved' : 'Added', tone: 'success' })
    setDialog(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recurring payments"
        description="Payments that repeat every month, quarter or year for at least three payments."
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => setDialog({ kind: 'add' })}>
            <Plus className="w-4 h-4" /> Add
          </button>
        }
      />
      {isLoading && <p className="text-midnight-400">Looking through your payments…</p>}
      {error && <p className="card text-expense">{error.message}</p>}
      {data && data.totals.length > 0 && <ContractsSummary totals={combined} unconverted={unconverted} />}
      {data && (
        <ContractsInsights
          insights={insights}
          currency={currency}
          onOpen={c => setDialog({ kind: 'edit', contract: c })}
        />
      )}
      {data && groups.length === 0 && (
        <p className="card text-midnight-300">
          No recurring payments found yet. They show up once a payment has repeated at least three times; you can also
          add one by hand.
        </p>
      )}
      <ContractsFromUploads candidates={candidates} busy={create.isPending} onAdd={addFromUpload} />
      {suggested > 0 && (
        <p className="px-1 text-sm text-midnight-400">
          {suggested} {suggested === 1 ? 'category is a suggestion' : 'categories are suggestions'}. Open a payment to
          confirm or change it; FinKit remembers your answer for that payee.
        </p>
      )}
      {groups.length > 0 && (
        <section className="card !p-3 sm:!p-4">
          {groups.map(g => (
            <div key={g.name} className="mb-2 last:mb-0">
              <div className="flex items-baseline justify-between px-2 pb-1 pt-3 text-xs uppercase tracking-wide text-midnight-500">
                <span>{g.name}</span>
                <span className="tabular-nums">{formatCurrency(g.monthly, currency)} / month</span>
              </div>
              <ul>{g.contracts.map(row)}</ul>
            </div>
          ))}
        </section>
      )}
      {(ended.length > 0 || dismissed.length > 0) && (
        <button className="text-sm text-midnight-400 underline" onClick={() => setShowEnded(v => !v)}>
          {showEnded ? 'Hide' : 'Show'} ended ({ended.length}) and dismissed ({dismissed.length})
        </button>
      )}
      {showEnded && (
        <section className="card !p-3 sm:!p-4">
          <ul>{[...ended, ...dismissed].map(row)}</ul>
        </section>
      )}
      {dialog && (
        <ContractDialog
          contract={dialog.kind === 'edit' ? dialog.contract : undefined}
          currency={currency}
          busy={create.isPending || update.isPending || remove.isPending}
          error={(create.error ?? update.error ?? remove.error)?.message}
          onSave={save}
          onState={dialog.kind === 'edit' ? state => setState(dialog.contract, state) : undefined}
          onDelete={
            dialog.kind === 'edit' && dialog.contract.state === 'manual'
              ? () =>
                  remove.mutateAsync(dialog.contract.id).then(() => {
                    pushToast({ message: 'Deleted', tone: 'success' })
                    setDialog(null)
                  })
              : undefined
          }
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
