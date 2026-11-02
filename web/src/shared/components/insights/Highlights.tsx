import Tooltip from '@/shared/components/Tooltip'
import { ArrowDownRight, ArrowUpRight, Lightbulb, X } from 'lucide-react'
import type { Highlight } from '@/shared/utils/analysis/highlights'

const ICON = { up: ArrowUpRight, down: ArrowDownRight, neutral: Lightbulb } as const
const COLOR = { up: 'text-amber-300', down: 'text-accent', neutral: 'text-midnight-400' } as const

/** What stands out, in plain sentences. Each one opens the transactions behind it. */
export default function Highlights({
  items,
  onOpen,
  onDismiss,
}: {
  items: Highlight[]
  onOpen: (h: Highlight) => void
  /** For notes that can be wrong (a flagged payment): lets the person silence one for good */
  onDismiss?: (h: Highlight) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="card !p-4">
      <h2 className="text-xs uppercase tracking-wide text-midnight-500">What stands out</h2>
      <ul className="mt-2">
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
                  className="flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-midnight-800/70"
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
                    className="ml-1 mt-1 shrink-0 rounded p-1 text-midnight-500 hover:bg-midnight-800 hover:text-white"
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
