import { useState } from 'react'
import { Bookmark, Check, X } from 'lucide-react'
import { TransactionsSearch } from '../app/search'

interface SavedView {
  name: string
  search: TransactionsSearch
}

const KEY = 'finkit.savedViews'

function load(): SavedView[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(v => v && typeof v.name === 'string' && v.search) : []
  } catch {
    return []
  }
}
function store(views: SavedView[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(views))
  } catch {
    // private window or blocked storage: views just won't persist
  }
}

/** Remember a combination of filters under a name, and bring it back with one click. */
export default function SavedViews({
  current,
  onApply,
}: {
  current: TransactionsSearch
  onApply: (search: TransactionsSearch) => void
}) {
  const [views, setViews] = useState<SavedView[]>(load)
  const [naming, setNaming] = useState(false)
  const hasFilters = Object.values(current).some(v => v !== undefined)

  const update = (next: SavedView[]) => {
    setViews(next)
    store(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map(v => (
        <span
          key={v.name}
          className="inline-flex items-center rounded-full bg-midnight-800 border border-midnight-700 text-sm"
        >
          <button onClick={() => onApply(v.search)} className="pl-3 pr-2 py-1 text-midnight-100 hover:text-white">
            {v.name}
          </button>
          <button
            onClick={() => update(views.filter(x => x.name !== v.name))}
            className="pr-2 py-1 text-midnight-500 hover:text-red-400"
            aria-label={`Delete view ${v.name}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      {naming ? (
        <form
          className="inline-flex items-center gap-1"
          onSubmit={e => {
            e.preventDefault()
            const name = String(new FormData(e.currentTarget).get('name') ?? '').trim()
            if (name) update([...views.filter(v => v.name !== name), { name, search: current }])
            setNaming(false)
          }}
        >
          <input
            name="name"
            autoFocus
            maxLength={30}
            placeholder="Name this view"
            aria-label="View name"
            className="input py-1 text-sm w-40"
            onKeyDown={e => e.key === 'Escape' && setNaming(false)}
          />
          <button type="submit" className="btn-primary p-1.5" aria-label="Save view">
            <Check className="w-4 h-4" />
          </button>
        </form>
      ) : (
        hasFilters && (
          <button
            onClick={() => setNaming(true)}
            className="inline-flex items-center gap-1.5 text-sm text-midnight-300 hover:text-white"
          >
            <Bookmark className="w-3.5 h-3.5" /> Save view
          </button>
        )
      )}
    </div>
  )
}
