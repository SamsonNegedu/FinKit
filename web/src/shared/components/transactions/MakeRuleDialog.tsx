import { useMemo, useState } from 'react'
import Modal from '@/shared/components/forms/Modal'
import Checkbox from '@/shared/components/forms/Checkbox'
import { suggestRule, type RuleMatch } from '@/shared/utils/categorizer'
import { formatCurrency } from '@/shared/utils/format'
import type { Transaction } from '@/shared/types'

/**
 * Turns one transaction into a rule: it offers what was seen (payee, distinctive words, amount) and the person keeps
 * only what makes rows "like this". More ticks means a narrower rule, so a phone plan can be told from groceries.
 */
export default function MakeRuleDialog({
  tx,
  category,
  currency,
  onSave,
  onClose,
}: {
  tx: Transaction
  category: string
  currency: string
  onSave: (match: RuleMatch) => void
  onClose: () => void
}) {
  const seen = useMemo(() => suggestRule(tx), [tx])
  const [payee, setPayee] = useState(Boolean(seen.payee))
  const [words, setWords] = useState<string[]>(seen.words.slice(0, 1))
  const [amount, setAmount] = useState(false)
  const match: RuleMatch = {
    ...(payee && seen.payee ? { payee: seen.payee } : {}),
    ...(words.length > 0 ? { words } : {}),
    ...(amount ? { amount: seen.amount } : {}),
  }
  const valid = Object.keys(match).length > 0

  return (
    <Modal title={`Rows like this are ${category}`} onClose={onClose}>
      <p className="mb-4 text-sm text-midnight-400">Tick what makes a row "like this". Every tick must match.</p>
      <div className="space-y-3">
        {seen.payee && (
          <label className="flex cursor-pointer items-center gap-3 text-sm text-midnight-100">
            <Checkbox checked={payee} onChange={setPayee} ariaLabel={`Payee is ${seen.payee}`} />
            Payee is <span className="font-medium text-white">{seen.payee}</span>
          </label>
        )}
        {seen.words.map(word => (
          <label key={word} className="flex cursor-pointer items-center gap-3 text-sm text-midnight-100">
            <Checkbox
              checked={words.includes(word)}
              onChange={on => setWords(w => (on ? [...w, word] : w.filter(x => x !== word)))}
              ariaLabel={`Text has ${word}`}
            />
            Text has <span className="font-medium text-white">{word}</span>
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-3 text-sm text-midnight-100">
          <Checkbox checked={amount} onChange={setAmount} ariaLabel="Amount is the same" />
          Amount is{' '}
          <span className="font-medium text-white">{formatCurrency(seen.amount, tx.currency || currency)}</span>
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary text-sm" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary text-sm"
          disabled={!valid}
          onClick={() => {
            onSave(match)
            onClose()
          }}
        >
          Save rule
        </button>
      </div>
    </Modal>
  )
}
