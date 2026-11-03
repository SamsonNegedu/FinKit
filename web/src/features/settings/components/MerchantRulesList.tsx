import { useEffect, useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import {
  getLearnedMappings,
  saveLearnedMapping,
  deleteLearnedMapping,
  LearnedMapping,
} from '@/features/settings/api/settings.api'
import { getAvailableCategories, merchantKeyOf, sameMerchant, setLocalLearnedMapping } from '@/shared/utils/categorizer'
import Select from '@/shared/components/forms/Select'
import { useApp } from '@/shared/contexts/AppState'

/** Every merchant → category rule the app has learned, so a wrong one can be fixed or removed. */
export default function MerchantRulesList() {
  const app = useApp()
  const [rules, setRules] = useState<LearnedMapping[] | null>(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getLearnedMappings().then(r =>
      setRules(r.sort((a, b) => (a.merchantDisplay || a.merchant).localeCompare(b.merchantDisplay || b.merchant))),
    )
  }, [])

  /** A rule's change applies now, not only on the next import; rows set by hand keep their own category */
  const applyToMatches = (merchant: string, category: string, detail?: string) => {
    const ids = app.transactions
      .filter(t => sameMerchant(merchantKeyOf(t), merchant) && t.categorySource !== 'manual' && !t.splitOf)
      .map(t => t.id)

    if (ids.length > 0) {
      app.bulkUpdate(ids, { category, categoryDetail: detail || undefined })
    }
  }

  const change = async (rule: LearnedMapping, category: string) => {
    const ok = await saveLearnedMapping(rule.merchant, category)

    if (!ok) {
      return setError("Couldn't save the change")
    }
    setError('')
    setLocalLearnedMapping(rule.merchant, { category })
    setRules(prev => prev && prev.map(r => (r.merchant === rule.merchant ? { ...r, category, detail: undefined } : r)))
    applyToMatches(rule.merchant, category)
  }

  const changeDetail = async (rule: LearnedMapping, detail: string) => {
    const ok = await saveLearnedMapping(rule.merchant, rule.category, detail || undefined)

    if (!ok) {
      return setError("Couldn't save the change")
    }
    setError('')
    setLocalLearnedMapping(rule.merchant, { category: rule.category, detail: detail || undefined })
    setRules(prev => prev && prev.map(r => (r.merchant === rule.merchant ? { ...r, detail: detail || undefined } : r)))
    applyToMatches(rule.merchant, rule.category, detail || undefined)
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
  let rulesBody

  if (rules === null) {
    rulesBody = <Loader2 className="w-5 h-5 animate-spin text-accent" />
  } else if (rules.length === 0) {
    rulesBody = (
      <p className="text-sm text-midnight-400">
        No merchant rules yet. Pick a category on a transaction and one is made for its merchant.
      </p>
    )
  } else {
    rulesBody = (
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
          {visible.map(rule => {
            const details = app.categoryList.details?.[rule.category] ?? []
            const detailOptions = [...new Set([...(rule.detail ? [rule.detail] : []), ...details])]

            return (
              <div key={rule.merchant} className="grid grid-cols-[1fr,160px,36px] gap-2 items-center">
                <span className="min-w-0 truncate text-sm text-ink" title={rule.merchantDisplay || rule.merchant}>
                  {rule.merchantDisplay || rule.merchant}
                </span>
                <div className="space-y-1">
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
                  {(detailOptions.length > 0 || rule.detail) && (
                    <Select
                      value={rule.detail ?? ''}
                      onChange={detail => changeDetail(rule, detail)}
                      className="text-xs py-0.5"
                      ariaLabel={`Subcategory for ${rule.merchantDisplay || rule.merchant}`}
                      options={[
                        { value: '', label: 'No subcategory' },
                        ...detailOptions.map(d => ({ value: d, label: d })),
                      ]}
                    />
                  )}
                </div>
                <button
                  onClick={() => remove(rule)}
                  className="p-2 hover:bg-midnight-800 rounded-lg text-midnight-400 hover:text-negative"
                  aria-label={`Delete rule for ${rule.merchantDisplay || rule.merchant}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
          {visible.length === 0 && <p className="text-sm text-midnight-400 xl:col-span-2">No rules match.</p>}
        </div>
      </>
    )
  }

  return (
    <>
      <section>
        <p className="text-xs text-midnight-500 mb-3">
          One per merchant, learned when you pick a category for a transaction. Changes apply to existing matches and
          future imports; rows you set by hand keep their own category.
        </p>
        {rulesBody}
        {error && <p className="text-xs text-negative mt-2">{error}</p>}
      </section>
    </>
  )
}
