import { useState } from 'react'
import Modal from '@/shared/components/forms/Modal'
import { formatCurrency } from '@/shared/utils/format'

/** One number for everything spent in a month. It counts what Analytics calls "Spent", so savings and investments are not in it. */
export default function BudgetCapDialog({
  current,
  currency,
  suggested,
  busy,
  error,
  onSave,
  onClose,
}: {
  current: number | null
  currency: string
  /** The sum of the category budgets: a natural ceiling to start from */
  suggested: number
  busy: boolean
  error?: string
  onSave: (amount: number) => Promise<unknown>
  onClose: () => void
}) {
  const [amount, setAmount] = useState(current ? String(current) : '')
  const value = Number(amount.replace(',', '.'))
  const submit = () =>
    onSave(value)
      .then(onClose)
      .catch(() => undefined)

  return (
    <Modal title="Monthly cap" onClose={onClose}>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-midnight-400">
          The most you want to spend in a month in total, including categories with no budget. Money you put into
          savings or investments isn't counted.
        </p>
        <div className="space-y-1">
          <label htmlFor="cap-amount" className="text-sm text-midnight-300">
            Cap per month ({currency})
          </label>
          <input
            id="cap-amount"
            className="input w-full"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && value > 0 && submit()}
          />
          {suggested > 0 && (
            <button className="text-xs text-emerald-400 hover:underline" onClick={() => setAmount(String(suggested))}>
              Use {formatCurrency(suggested, currency)}, the total of your category budgets
            </button>
          )}
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!(value > 0) || busy} onClick={submit}>
            Save cap
          </button>
        </div>
      </div>
    </Modal>
  )
}
