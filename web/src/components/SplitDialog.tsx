import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Transaction } from '../types'
import { getAvailableCategories } from '../lib/categorizer'
import { SplitPart, isValidSplit, remaining } from '../lib/splits'
import { formatCurrency } from '../lib/format'

interface SplitDialogProps {
  transaction: Transaction
  initialParts?: SplitPart[]
  onSave: (parts: SplitPart[]) => void
  onCancel: () => void
}

// Split one payment across categories. The parts must add up to the original amount.
export default function SplitDialog({ transaction, initialParts, onSave, onCancel }: SplitDialogProps) {
  // Splits work on the original amount, before any currency conversion
  const total = transaction.originalAmount ?? transaction.amount
  const currency = transaction.originalCurrency ?? transaction.currency
  const categories = getAvailableCategories().filter(c => c !== 'Transfer' && c !== 'Income')

  const [parts, setParts] = useState<SplitPart[]>(
    initialParts ?? [
      { amount: Math.round(total * 50) / 100, category: transaction.category || 'Other' },
      { amount: Math.round(total * 50) / 100, category: categories.find(c => c !== transaction.category) || 'Other' },
    ],
  )

  const left = remaining(total, parts)
  const valid = isValidSplit(total, parts)
  const update = (i: number, patch: Partial<SplitPart>) =>
    setParts(parts.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-title"
    >
      <div className="bg-midnight-900 border border-midnight-700 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 id="split-title" className="text-lg font-semibold text-white">
          Split transaction
        </h3>
        <p className="text-sm text-midnight-400 mt-1 truncate">
          {transaction.displayName || transaction.merchant || transaction.recipient || transaction.description} ·{' '}
          {formatCurrency(total, currency)}
        </p>

        <div className="mt-4 space-y-2">
          {parts.map((part, i) => (
            <div key={i} className="grid grid-cols-[110px,1fr,36px] gap-2 items-center">
              <input
                type="number"
                step="0.01"
                min="0"
                value={part.amount || ''}
                onChange={e => update(i, { amount: parseFloat(e.target.value) || 0 })}
                className="input py-1.5 text-sm"
                aria-label={`Amount for part ${i + 1}`}
              />
              <select
                value={part.category}
                onChange={e => update(i, { category: e.target.value })}
                className="input py-1.5 text-sm"
                aria-label={`Category for part ${i + 1}`}
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setParts(parts.filter((_, idx) => idx !== i))}
                disabled={parts.length <= 2}
                className="p-2 text-midnight-400 hover:text-red-400 disabled:opacity-30"
                aria-label={`Remove part ${i + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setParts([...parts, { amount: Math.max(left, 0), category: 'Other' }])}
            className="flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <Plus className="w-4 h-4" /> Add part
          </button>
          <span className={`text-sm ${Math.abs(left) < 0.005 ? 'text-income' : 'text-orange-400'}`} aria-live="polite">
            {Math.abs(left) < 0.005 ? 'Adds up' : `${formatCurrency(left, currency)} left to assign`}
          </span>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="flex-1 btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="flex-1 btn-primary disabled:opacity-50" disabled={!valid} onClick={() => onSave(parts)}>
            Save split
          </button>
        </div>
      </div>
    </div>
  )
}
