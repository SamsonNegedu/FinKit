import { useState } from 'react'
import Checkbox from '@/shared/components/forms/Checkbox'
import Modal from '@/shared/components/forms/Modal'
import Select from '@/shared/components/forms/Select'
import { useApp } from '@/shared/contexts/AppState'
import type { Transaction } from '@/shared/types'
import { displayNameOf } from '@/shared/utils/aliases'
import { getAvailableCategories } from '@/shared/utils/categorizer/categoryMeta'
import { formatDay } from '@/shared/utils/dates'
import { formatCurrency } from '@/shared/utils/format'
import { linkKey } from '@/shared/utils/ids'
import type { Frequency } from '../api/contracts.api'
import { useCreateContractFromPayments } from '../hooks/contracts-queries'
import { prefillFromPayments } from '../utils/paymentsPrefill'

interface Props {
  transactions: Transaction[]
  onClose: () => void
  onDone: () => void
}

const FREQUENCIES = [
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Every year' },
]

/**
 * Makes a recurring payment from rows picked in the transaction list, for what detection misses (a bill whose text
 * keeps changing). The picked payments are linked to it, so it has a history. Only bank-synced rows have a server
 * reference; imported files stay in the browser, so they are left out here.
 */
export default function AddToContractsDialog({ transactions, onClose, onDone }: Props) {
  const { tripLinks, pushToast } = useApp()
  const create = useCreateContractFromPayments()
  const [off, setOff] = useState<ReadonlySet<string>>(new Set())
  // Money in is not a recurring cost
  const rows = transactions.flatMap(t => {
    const ref = tripLinks.refByKey.get(linkKey(t))

    return ref && t.type === 'expense' ? [{ t, ref }] : []
  })
  const skipped = transactions.length - rows.length
  const picked = rows.filter(r => !off.has(r.ref))
  const currencies = new Set(picked.map(r => r.t.currency))
  const guess = prefillFromPayments(picked.map(r => ({ date: r.t.date, amount: r.t.amount, name: displayNameOf(r.t) })))
  const categories = getAvailableCategories().filter(c => c !== 'Income' && c !== 'Transfer')
  // Edits are kept apart from the guess, which follows the ticks until the person types over it
  const [edits, setEdits] = useState<{
    name?: string
    amount?: string
    frequency?: Frequency
    kind?: 'fixed' | 'variable'
    group?: string
  }>({})
  const name = edits.name ?? guess.name
  const amount = edits.amount ?? String(guess.amount)
  const frequency = edits.frequency ?? guess.frequency
  const kind = edits.kind ?? guess.kind
  const group = edits.group ?? (categories.includes('Other') ? 'Other' : categories[0])
  const canSave = picked.length > 0 && currencies.size === 1 && name.trim() !== '' && Number(amount) > 0
  const flip = (ref: string) =>
    setOff(prev => {
      const next = new Set(prev)

      if (!next.delete(ref)) {
        next.add(ref)
      }

      return next
    })

  const save = () =>
    create.mutate(
      {
        name: name.trim(),
        group,
        amount: Number(amount),
        frequency,
        kind,
        refs: picked.map(r => r.ref),
      },
      {
        onSuccess: () => {
          pushToast({ message: `Added ${name.trim()} to recurring payments`, tone: 'success' })
          onDone()
        },
      },
    )

  if (rows.length === 0) {
    return (
      <Modal title="Add to recurring payments" onClose={onClose} width="max-w-lg">
        <p className="mt-3 text-sm text-midnight-400">
          Only payments from a bank sync can be added. Imported files never leave this browser, so none of the selected
          ones qualify.
        </p>
        <div className="mt-6 flex justify-end">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Add to recurring payments" onClose={onClose} width="max-w-lg">
      <div className="mt-3 space-y-4">
        <p className="text-sm text-midnight-400">
          These payments are linked to it, so it shows their history and when the next one is due. Later payments to the
          same payee join it. Untick any that do not belong.
        </p>
        {skipped > 0 && (
          <p className="text-sm text-warning">
            {skipped} left out: only synced payments can be added. Imported files never leave this browser.
          </p>
        )}
        {currencies.size > 1 && <p className="text-sm text-expense">Pick payments in one currency.</p>}
        <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-lg border border-line px-3">
          {rows.map(({ t, ref }) => (
            <li key={ref} className="flex items-center gap-3 py-2">
              <Checkbox checked={!off.has(ref)} onChange={() => flip(ref)} ariaLabel={`Include ${displayNameOf(t)}`} />
              <span className="w-14 shrink-0 text-sm text-midnight-400">{formatDay(t.date)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{displayNameOf(t)}</span>
              <span className="text-sm tabular-nums text-midnight-200">{formatCurrency(t.amount, t.currency)}</span>
            </li>
          ))}
        </ul>
        <label className="block text-sm text-midnight-300">
          Name
          <input
            className="input mt-1 w-full"
            value={name}
            maxLength={80}
            onChange={e => setEdits(prev => ({ ...prev, name: e.target.value }))}
          />
        </label>
        <div className="text-sm text-midnight-300">
          Category
          <Select
            ariaLabel="Category"
            value={group}
            onChange={v => setEdits(prev => ({ ...prev, group: v }))}
            options={categories.map(c => ({ value: c, label: c }))}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm text-midnight-300">
            Typical amount{currencies.size === 1 ? ` (${[...currencies][0]})` : ''}
            <input
              className="input mt-1 w-full"
              inputMode="decimal"
              value={amount}
              onChange={e => setEdits(prev => ({ ...prev, amount: e.target.value }))}
            />
          </label>
          <div className="text-sm text-midnight-300">
            How often
            <Select
              ariaLabel="How often"
              value={frequency}
              onChange={v => setEdits(prev => ({ ...prev, frequency: v as Frequency }))}
              options={FREQUENCIES}
              className="mt-1"
            />
          </div>
        </div>
        {create.error && <p className="text-sm text-expense">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary disabled:opacity-50" disabled={!canSave || create.isPending} onClick={save}>
            {create.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
