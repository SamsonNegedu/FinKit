import { useEffect, useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import {
  getLearnedMappings,
  saveLearnedMapping,
  deleteLearnedMapping,
  LearnedMapping,
} from '@/features/settings/api/settings.api'
import { getAvailableCategories, setLocalLearnedMapping } from '@/shared/utils/categorizer'
import Select from '@/shared/components/forms/Select'
import TransactionRulesList from './TransactionRulesList'

// Lists every merchant → category rule the app has learned so a wrong one can be fixed or removed
export default function RulesManager() {
  const [rules, setRules] = useState<LearnedMapping[] | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getLearnedMappings().then(r =>
      setRules(r.sort((a, b) => (a.merchantDisplay || a.merchant).localeCompare(b.merchantDisplay || b.merchant))),
    )
  }, [])

  const change = async (rule: LearnedMapping, category: string) => {
    const ok = await saveLearnedMapping(rule.merchant, category)

    if (!ok) {
      return setError("Couldn't save the change")
    }
    setError('')
    setLocalLearnedMapping(rule.merchant, category)
    setRules(prev => prev && prev.map(r => (r.merchant === rule.merchant ? { ...r, category } : r)))
  }

  const remove = async (rule: LearnedMapping) => {
    const ok = await deleteLearnedMapping(rule.merchant)

    if (!ok) {
      return setError("Couldn't delete the rule")
    }
    setError('')
    setLocalLearnedMapping(rule.merchant, null)
    setRules(prev => prev && prev.filter(r => r.merchant !== rule.merchant))
  }

  const visible = (rules || []).filter(r =>
    (r.merchantDisplay || r.merchant).toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <>
      <TransactionRulesList />
      <section>
        <h3 className="text-sm font-medium text-midnight-300 mb-1">Learned rules</h3>
        <p className="text-xs text-midnight-500 mb-3">
          Created when you recategorize a transaction. Changes apply to future imports and when data is re-processed.
        </p>
        {rules === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        ) : rules.length === 0 ? (
          <p className="text-sm text-midnight-400">No learned rules yet.</p>
        ) : (
          <>
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder={`Search ${rules.length} rules`}
              className="input w-full text-sm mb-2"
              aria-label="Search rules"
            />
            <div className="max-h-[calc(100vh-20rem)] min-h-56 overflow-y-auto pr-2 grid content-start gap-x-8 gap-y-1 xl:grid-cols-2">
              {visible.map(rule => (
                <div key={rule.merchant} className="grid grid-cols-[1fr,180px,40px] gap-2 items-center">
                  <span className="text-sm text-white truncate" title={rule.merchantDisplay || rule.merchant}>
                    {rule.merchantDisplay || rule.merchant}
                  </span>
                  <Select
                    value={rule.category}
                    onChange={category => change(rule, category)}
                    className="text-sm py-1"
                    ariaLabel={`Category for ${rule.merchantDisplay || rule.merchant}`}
                    options={[...new Set([rule.category, ...getAvailableCategories()])].map(c => ({
                      value: c,
                      label: c,
                    }))}
                  />
                  <button
                    onClick={() => remove(rule)}
                    className="p-2 hover:bg-midnight-800 rounded-lg text-midnight-400 hover:text-red-400"
                    aria-label={`Delete rule for ${rule.merchantDisplay || rule.merchant}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {visible.length === 0 && <p className="text-sm text-midnight-400 xl:col-span-2">No rules match.</p>}
            </div>
          </>
        )}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </section>
    </>
  )
}
