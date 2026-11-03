import { useState } from 'react'
import Tooltip from '@/shared/components/Tooltip'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Lightbulb, X } from 'lucide-react'
import type { Highlight } from '@/shared/utils/analysis/highlights'

const ICON = { up: ArrowUpRight, down: ArrowDownRight, neutral: Lightbulb } as const
const COLOR = { up: 'text-warning', down: 'text-positive', neutral: 'text-ink-faint' } as const

const COLLAPSED_KEY = 'finkit.highlights.collapsed'

// Storage can be blocked (private mode); the card then just starts open
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/** What stands out, in plain sentences. Each one opens the transactions behind it. */
export default function Highlights({
  items,
  onOpen,
  onDismiss,
  collapsible = false,
}: {
  items: Highlight[]
  onOpen: (h: Highlight) => void
  /** For notes that can be wrong (a flagged payment): lets the person silence one for good */
  onDismiss?: (h: Highlight) => void
  /** Lets the person fold the card away, and remembers it. Off where the notes are the page's main content. */
  collapsible?: boolean
}) {
  const [folded, setCollapsed] = useState(readCollapsed)
  const collapsed = collapsible && folded

  if (items.length === 0) {
    return null
  }

  const toggle = () => {
    const next = !collapsed

    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      // The choice just isn't remembered
    }
  }

  return (
    <section className="card">
      <h2 className="text-xs uppercase tracking-wide text-midnight-500">
        {collapsible ? (
          <button
            onClick={toggle}
            aria-expanded={!collapsed}
            className="flex w-full items-center justify-between gap-2 uppercase hover:text-midnight-300"
          >
            <span>
              What stands out <span className="normal-case text-midnight-400">({items.length})</span>
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        ) : (
          'What stands out'
        )}
      </h2>
      <ul className={`mt-2 ${collapsed ? 'hidden' : ''}`}>
        {items.map(h => {
          const Icon = ICON[h.tone]
          const body = (
            <>
              <Icon className={`h-4 w-4 shrink-0 ${COLOR[h.tone]}`} />
              <span className="text-sm text-midnight-200">{h.text}</span>
            </>
          )

          return (
            <li key={h.id} className="flex items-start">
              {h.target ? (
                <button
                  onClick={() => onOpen(h)}
                  className="flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-accent/10"
                >
                  {body}
                </button>
              ) : (
                <div className="flex w-full items-start gap-2 px-1.5 py-1.5">{body}</div>
              )}
              {h.dismissable && onDismiss && (
                <Tooltip label="Not a problem: don't flag this again">
                  <button
                    onClick={() => onDismiss(h)}
                    aria-label="Don't flag this again"
                    className="ml-1 mt-1 shrink-0 rounded p-1 text-midnight-500 hover:bg-midnight-800 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
