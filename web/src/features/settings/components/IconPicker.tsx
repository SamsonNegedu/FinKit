import { useState } from 'react'
import { Search } from 'lucide-react'
import { iconNames } from 'lucide-react/dynamic'
import DynamicCategoryIcon from '@/shared/components/DynamicCategoryIcon'
import { ICON_SET } from '@/shared/components/categoryIconSet'

const SHOWN = 70

/**
 * A short list of common icons, or search the whole Lucide set by name ("dog", "fuel", "church"). Only the icons on
 * screen are fetched, so having every one available costs nothing until you look for one.
 */
export default function IconPicker({
  value,
  color,
  onPick,
}: {
  value?: string
  color: string
  onPick: (icon: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase().replace(/\s+/g, '-')
  const names = q ? iconNames.filter(n => n.includes(q)).slice(0, SHOWN) : Object.keys(ICON_SET)

  return (
    <div>
      <div className="relative mb-2">
        <Search
          className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-midnight-400"
          aria-hidden="true"
        />
        <input
          className="input w-full !py-1.5 pl-8 text-sm"
          placeholder="Search all icons"
          aria-label="Search icons"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="grid max-h-56 grid-cols-7 gap-1 overflow-y-auto">
        {names.map(name => {
          const Static = ICON_SET[name]

          return (
            <button
              key={name}
              aria-label={name}
              aria-pressed={value === name}
              onClick={() => onPick(name)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-midnight-700 ${
                value === name ? 'bg-midnight-700 ring-1 ring-accent' : ''
              }`}
              style={{ color }}
            >
              {Static ? <Static className="h-4 w-4" /> : <DynamicCategoryIcon name={name} className="h-4 w-4" />}
            </button>
          )
        })}
      </div>
      {q && names.length === 0 && <p className="py-2 text-xs text-midnight-400">No icon called “{query.trim()}”.</p>}
    </div>
  )
}
