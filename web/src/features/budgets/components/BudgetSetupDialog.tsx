import { useState } from 'react'
import Checkbox from '@/shared/components/forms/Checkbox'
import Modal from '@/shared/components/forms/Modal'
import CategoryIcon from '@/shared/components/CategoryIcon'

interface Suggestion {
  category: string
  amount: number
}

/** First setup in one go: every category you spend in, with a limit from your recent months. Untick or edit, then save. */
export default function BudgetSetupDialog({
  suggestions,
  currency,
  busy,
  error,
  onSave,
  onClose,
}: {
  suggestions: Suggestion[]
  currency: string
  busy: boolean
  error?: string
  onSave: (picked: Suggestion[]) => Promise<unknown>
  onClose: () => void
}) {
  const [on, setOn] = useState(() => new Set(suggestions.map(s => s.category)))
  const [amounts, setAmounts] = useState(() => Object.fromEntries(suggestions.map(s => [s.category, String(s.amount)])))
  const valid = (category: string) => Number((amounts[category] ?? '').replace(',', '.')) > 0
  const picked = suggestions
    .filter(s => on.has(s.category) && valid(s.category))
    .map(s => ({ category: s.category, amount: Number(amounts[s.category].replace(',', '.')) }))
  const toggle = (category: string, checked: boolean) =>
    setOn(prev => {
      const next = new Set(prev)

      if (checked) {
        next.add(category)
      } else {
        next.delete(category)
      }

      return next
    })

  return (
    <Modal title="Set up budgets" onClose={onClose} width="max-w-lg">
      <p className="text-sm text-midnight-400">
        Limits are what each category averaged per month over your last three months. Untick what you don't want to
        budget and change any amount.
      </p>
      <ul className="mt-4 max-h-[50vh] divide-y divide-midnight-800 overflow-y-auto">
        {suggestions.map(s => (
          <li key={s.category} className="flex items-center gap-3 py-2">
            <Checkbox
              checked={on.has(s.category)}
              onChange={c => toggle(s.category, c)}
              ariaLabel={`Budget ${s.category}`}
            />
            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-white">
              <CategoryIcon category={s.category} size="sm" />
              <span className="truncate">{s.category}</span>
            </span>
            <input
              className={`input w-28 py-1 text-right text-sm ${on.has(s.category) && !valid(s.category) ? 'border-rose-500' : ''}`}
              inputMode="decimal"
              aria-label={`${s.category} limit in ${currency}`}
              value={amounts[s.category]}
              onChange={e => setAmounts(a => ({ ...a, [s.category]: e.target.value }))}
            />
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          disabled={picked.length === 0 || busy}
          onClick={() => onSave(picked).catch(() => undefined)}
        >
          Add {picked.length} {picked.length === 1 ? 'budget' : 'budgets'}
        </button>
      </div>
    </Modal>
  )
}
