import { useState } from 'react'
import Modal from '@/shared/components/forms/Modal'
import Select from '@/shared/components/forms/Select'
import { getAvailableCategories, getCategoryColor } from '@/shared/utils/categorizer/categoryMeta'
import type { Contract, Frequency, NewContract } from '../api/contracts.api'
import { useContractPayments } from '../hooks/contracts-queries'
import ContractHistory from './ContractHistory'

// Payments go out; income and transfers between your own accounts are not contracts
const categoryOptions = (current?: string) =>
  // The contract's own group stays listed even if it has been archived, so the box is never blank
  [...new Set([...(current ? [current] : []), ...getAvailableCategories()])]
    .filter(c => c !== 'Income' && c !== 'Transfer')
    .map(c => ({ value: c, label: c }))

interface Props {
  /** Present when editing; a new contract has none */
  contract?: Contract
  currency: string
  busy: boolean
  error?: string
  onSave: (draft: Draft) => void
  onDelete?: () => void
  /** Confirm it, say it is not a contract, or bring a dismissed one back */
  onState?: (state: 'confirmed' | 'dismissed' | 'detected') => void
  onClose: () => void
}
export interface Draft {
  name: string
  group: string
  note: string
  kmPerYear: string
  amount: string
  frequency: Frequency
  kind: 'fixed' | 'variable'
}

const text = (v: string) => v.trim()
const FREQUENCIES = [
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'yearly', label: 'Every year' },
]

export const isDraftValid = (d: Draft, isNew: boolean) =>
  text(d.name) !== '' && (!isNew || Number(d.amount) > 0) && (d.kmPerYear === '' || Number(d.kmPerYear) > 0)

/** What the contract's payments cannot tell: its name, group, a note, and the kilometres a car is driven. */
export function toNew(d: Draft, currency: string): NewContract {
  return {
    name: text(d.name),
    group: d.group,
    amount: Number(d.amount),
    currency,
    frequency: d.frequency,
    kind: d.kind,
    ...(text(d.note) ? { note: text(d.note) } : {}),
    ...(d.kmPerYear ? { kmPerYear: Number(d.kmPerYear) } : {}),
  }
}

export default function ContractDialog({ contract, currency, busy, error, onSave, onDelete, onState, onClose }: Props) {
  const isNew = !contract
  const [d, setD] = useState<Draft>({
    name: contract?.name ?? '',
    group: contract?.group ?? 'Other',
    note: contract?.note ?? '',
    kmPerYear: contract?.kmPerYear ? String(contract.kmPerYear) : '',
    amount: '',
    frequency: 'monthly',
    kind: 'fixed',
  })
  const payments = useContractPayments(contract?.id ?? '', !!contract && contract.state !== 'manual')
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }))

  return (
    <Modal title={isNew ? 'Add a recurring payment' : 'Edit recurring payment'} onClose={onClose} width="max-w-xl">
      {contract && contract.state !== 'manual' && (
        <p className="mt-1 text-sm text-midnight-400">
          Found from {contract.count} payments
          {contract.firstDate && ` since ${contract.firstDate}`}.{' '}
          {contract.state === 'confirmed' ? 'You confirmed it.' : ''}
        </p>
      )}
      {payments.data && payments.data.length > 0 && (
        <ContractHistory
          payments={payments.data}
          currency={contract!.currency}
          color={getCategoryColor(contract!.group)}
        />
      )}
      {contract && onState && contract.state !== 'manual' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {contract.state === 'dismissed' ? (
            <button className="btn-secondary" disabled={busy} onClick={() => onState('detected')}>
              Bring it back
            </button>
          ) : (
            <>
              {contract.state !== 'confirmed' && (
                <button className="btn-secondary" disabled={busy} onClick={() => onState('confirmed')}>
                  This is recurring
                </button>
              )}
              <button className="btn-secondary" disabled={busy} onClick={() => onState('dismissed')}>
                Not recurring
              </button>
            </>
          )}
        </div>
      )}
      <div className="mt-4 space-y-3">
        <label className="block text-sm text-midnight-300">
          Name
          <input
            className="input mt-1 w-full"
            value={d.name}
            onChange={e => set('name', e.target.value)}
            maxLength={80}
          />
        </label>
        <div className="text-sm text-midnight-300">
          Category
          {contract?.groupSource === 'suggested' && (
            <span className="ml-2 text-xs text-midnight-500">suggested: confirm it or pick another</span>
          )}
          <Select
            ariaLabel="Category"
            value={d.group}
            onChange={v => set('group', v)}
            options={categoryOptions(contract?.group)}
            className="mt-1"
          />
        </div>
        {isNew && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-midnight-300">
              Amount ({currency})
              <input
                className="input mt-1 w-full"
                inputMode="decimal"
                value={d.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </label>
            <div className="text-sm text-midnight-300">
              How often
              <Select
                ariaLabel="How often"
                value={d.frequency}
                onChange={v => set('frequency', v as Frequency)}
                options={FREQUENCIES}
                className="mt-1"
              />
            </div>
          </div>
        )}
        {/* Only a car has a cost per kilometre; a filled-in value stays visible so it can be changed or cleared */}
        {(d.group === 'Car' || d.kmPerYear !== '') && (
          <label className="block text-sm text-midnight-300">
            Kilometres per year
            <span className="ml-2 text-xs text-midnight-500">shows the cost per km</span>
            <input
              className="input mt-1 w-full"
              inputMode="numeric"
              value={d.kmPerYear}
              onChange={e => set('kmPerYear', e.target.value.replace(/\D/g, ''))}
            />
          </label>
        )}
        <label className="block text-sm text-midnight-300">
          Note
          <input
            className="input mt-1 w-full"
            value={d.note}
            onChange={e => set('note', e.target.value)}
            maxLength={300}
          />
        </label>
        {error && <p className="text-sm text-expense">{error}</p>}
      </div>
      <div className="mt-6 flex items-center justify-between gap-2">
        {onDelete ? (
          <button className="btn-secondary" onClick={onDelete} disabled={busy}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary disabled:opacity-50"
            disabled={busy || !isDraftValid(d, isNew)}
            onClick={() => onSave(d)}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
