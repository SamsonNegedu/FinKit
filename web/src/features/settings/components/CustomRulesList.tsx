import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { removeLocalRule, type TransactionRule } from '@/shared/utils/categorizer'
import { deleteTransactionRule, getTransactionRules } from '@/features/settings/api/transactionRules.api'

const describe = (r: TransactionRule) =>
  [
    r.match.payee && `payee ${r.match.payee}`,
    ...(r.match.words ?? []).map(w => `text has ${w}`),
    r.match.amount !== undefined && `amount ${r.match.amount}`,
  ]
    .filter(Boolean)
    .join(' · ')

/** The rules you made from a transaction ("Make a rule…" in the category picker), so a wrong one can be removed. */
export default function CustomRulesList() {
  const [rules, setRules] = useState<TransactionRule[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getTransactionRules().then(setRules)
  }, [])

  const remove = async (rule: TransactionRule) => {
    if (!(await deleteTransactionRule(rule.id))) {
      return setError("Couldn't delete the rule")
    }
    setError('')
    removeLocalRule(rule.id)
    setRules(prev => prev.filter(r => r.id !== rule.id))
  }

  return (
    <section>
      <p className="text-xs text-midnight-500 mb-3">
        Rules you build from a transaction with "Make a rule…" in the category picker, matching on payee, words or
        amount. They win over merchant rules, and the one with more conditions wins. Deleting one applies when data is
        re-processed.
      </p>
      {rules.length === 0 && (
        <p className="text-sm text-midnight-400">
          No custom rules yet. Open a transaction's category, pick one, then choose "Make a rule…".
        </p>
      )}
      <div className="grid gap-1">
        {rules.map(rule => (
          <div key={rule.id} className="grid grid-cols-[1fr,auto,40px] items-center gap-3">
            <span className="truncate text-sm text-white" title={describe(rule)}>
              {describe(rule)}
            </span>
            <span className="text-sm text-midnight-300">{rule.category}</span>
            <button
              onClick={() => remove(rule)}
              className="p-2 hover:bg-midnight-800 rounded-lg text-midnight-400 hover:text-red-400"
              aria-label={`Delete rule: ${describe(rule)}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </section>
  )
}
