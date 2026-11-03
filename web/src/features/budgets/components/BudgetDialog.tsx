import { Check } from 'lucide-react'
import { useState } from 'react'
import Checkbox from '@/shared/components/forms/Checkbox'
import Modal from '@/shared/components/forms/Modal'
import Select from '@/shared/components/forms/Select'
import { formatCurrency } from '@/shared/utils/format'
import CategoryIcon from '@/shared/components/CategoryIcon'

/** Adds budgets one after another without closing, so a first setup is one sitting. The suggestion is what the category averaged over the last three months, one click to use. */
export default function BudgetDialog({
  categories,
  initial,
  currency,
  suggest,
  busy,
  error,
  onSave,
  onClose,
}: {
  categories: string[]
  initial: string
  currency: string
  suggest: (category: string) => number | null
  busy: boolean
  error?: string
  onSave: (category: string, amount: number, rollover: boolean) => Promise<unknown>
  onClose: () => void
}) {
  const [category, setCategory] = useState(initial)
  const [amount, setAmount] = useState('')
  const [rollover, setRollover] = useState(false)
  const [added, setAdded] = useState<Array<{ category: string; amount: number }>>([])
  const value = Number(amount.replace(',', '.'))
  const canSave = category !== '' && value > 0
  const submit = () =>
    onSave(category, value, rollover)
      .then(() => {
        setAdded(a => [...a, { category, amount: value }])
        setCategory('')
        setAmount('')
        setRollover(false)
        document.getElementById('budget-category')?.focus()
      })
      // The page shows why it failed; the form stays as it was so nothing has to be typed again
      .catch(() => undefined)
  const suggested = category ? suggest(category) : null

  return (
    <Modal title="Add a budget" onClose={onClose}>
      <div className="mt-4 space-y-4">
        <div className="space-y-1">
          <label htmlFor="budget-category" className="text-sm text-midnight-300">
            Category
          </label>
          <Select
            id="budget-category"
            className="w-full"
            placeholder="Choose a category"
            value={category}
            onChange={setCategory}
            options={categories.map(c => ({ value: c, label: c, icon: <CategoryIcon category={c} size="sm" /> }))}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="budget-amount" className="text-sm text-midnight-300">
            Limit per month ({currency})
          </label>
          <input
            id="budget-amount"
            className="input w-full"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSave && submit()}
          />
          {suggested !== null && (
            <button className="text-xs text-positive hover:underline" onClick={() => setAmount(String(suggested))}>
              Use {formatCurrency(suggested, currency)}, about what you spent per month lately
            </button>
          )}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-midnight-200">
          <Checkbox checked={rollover} onChange={setRollover} />
          Carry unspent money into the next month
        </label>
        {error && <p className="text-sm text-negative">{error}</p>}
        {added.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Added so far">
            {added.map(a => (
              <li
                key={a.category}
                className="flex items-center gap-1 rounded-full bg-midnight-800 px-2.5 py-1 text-xs text-midnight-200"
              >
                <Check className="h-3 w-3 text-positive" aria-hidden="true" />
                {a.category} {formatCurrency(a.amount, currency)}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            {added.length > 0 ? 'Done' : 'Cancel'}
          </button>
          <button className="btn-primary" disabled={!canSave || busy} onClick={submit}>
            {added.length > 0 ? 'Add another' : 'Add budget'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
