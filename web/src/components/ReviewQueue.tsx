import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, EyeOff, SkipForward } from 'lucide-react'
import { formatCurrency } from '../lib/format'
import { Transaction } from '../types'
import { getCategoryColor, getExpenseCategories, merchantKeyOf, sameMerchant } from '../lib/categorizer'

interface ReviewQueueProps {
  transactions: Transaction[]
  onBulkUpdate: (ids: string[], updates: Partial<Transaction>) => void
  currency: string
}

export function needsReview(tx: Transaction): boolean {
  return (
    tx.type === 'expense' &&
    !tx.isExcluded &&
    tx.categorySource !== 'manual' &&
    (!tx.category || tx.category === 'Other')
  )
}

interface Group {
  key: string
  items: Transaction[]
  total: number
}


export default function ReviewQueue({ transactions, onBulkUpdate, currency }: ReviewQueueProps) {
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [totalAtStart, setTotalAtStart] = useState<number | null>(null)

  const groups = useMemo(() => {
    const result: Group[] = []
    for (const tx of transactions.filter(needsReview)) {
      const key = merchantKeyOf(tx)
      const group = result.find(g => sameMerchant(g.key, key))
      if (group) {
        group.items.push(tx)
        group.total += tx.amount
      } else {
        result.push({ key, items: [tx], total: tx.amount })
      }
    }
    return result.sort((a, b) => b.total - a.total)
  }, [transactions])

  // Quick-pick categories: the ones already used most in this data, padded with defaults
  const quickPicks = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of transactions) {
      if (t.type !== 'expense' || !t.category || t.category === 'Other' || t.category === 'Transfer') continue
      counts.set(t.category, (counts.get(t.category) || 0) + 1)
    }
    const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
    const padded = [...used, ...getExpenseCategories().filter(c => c !== 'Other' && !used.includes(c))]
    return padded.slice(0, 9)
  }, [transactions])

  const pending = groups.filter(g => !skipped.has(g.key))
  const current = pending[0]

  useEffect(() => {
    if (totalAtStart === null && groups.length > 0) setTotalAtStart(groups.length)
  }, [groups.length, totalAtStart])

  const assign = (category: string) => {
    if (!current) return
    onBulkUpdate(current.items.map(t => t.id), { category })
  }
  const exclude = () => {
    if (!current) return
    onBulkUpdate(current.items.map(t => t.id), { isExcluded: true })
  }
  const skip = () => {
    if (!current) return
    setSkipped(prev => new Set(prev).add(current.key))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[1-9]$/.test(e.key)) {
        const category = quickPicks[Number(e.key) - 1]
        if (category) assign(category)
      } else if (e.key === 's') skip()
      else if (e.key === 'e') exclude()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (groups.length === 0) {
    return (
      <div className="card text-center py-12">
        <CheckCircle2 className="w-10 h-10 text-income mx-auto mb-3" />
        <p className="text-white font-medium">Everything is categorized</p>
        <p className="text-sm text-midnight-400 mt-1">Nothing needs your review.</p>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="card text-center py-12">
        <p className="text-white font-medium">{skipped.size} skipped</p>
        <button className="btn-secondary mt-4" onClick={() => setSkipped(new Set())}>
          Review skipped again
        </button>
      </div>
    )
  }

  const done = Math.max(0, (totalAtStart ?? groups.length) - groups.length)
  const total = totalAtStart ?? groups.length

  return (
    <div className="card space-y-5">
      <div>
        <div className="flex justify-between text-xs text-midnight-400 mb-1">
          <span>{pending.length} merchant{pending.length === 1 ? '' : 's'} left</span>
          <span>{done} of {total} done</span>
        </div>
        <div className="h-1.5 rounded-full bg-midnight-800 overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white">{current.items[0].displayName || current.key}</h3>
        <p className="text-sm text-midnight-400">
          {current.items.length} transaction{current.items.length === 1 ? '' : 's'} · {formatCurrency(current.total, currency)} total
        </p>
        <ul className="mt-3 text-sm text-midnight-300 space-y-1">
          {current.items.slice(0, 3).map(t => (
            <li key={t.id} className="truncate">{t.description}</li>
          ))}
          {current.items.length > 3 && <li className="text-midnight-500">+ {current.items.length - 3} more</li>}
        </ul>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {quickPicks.map((category, i) => (
          <button
            key={category}
            onClick={() => assign(category)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-midnight-800 hover:bg-midnight-700 text-left transition-colors"
          >
            <kbd className="text-xs text-midnight-400 border border-midnight-600 rounded px-1.5">{i + 1}</kbd>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
            <span className="text-sm truncate">{category}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={skip} className="btn-secondary text-sm flex items-center gap-2">
          <SkipForward className="w-4 h-4" /> Skip <kbd className="text-xs text-midnight-400">S</kbd>
        </button>
        <button onClick={exclude} className="btn-secondary text-sm flex items-center gap-2">
          <EyeOff className="w-4 h-4" /> Exclude <kbd className="text-xs text-midnight-400">E</kbd>
        </button>
      </div>
    </div>
  )
}
