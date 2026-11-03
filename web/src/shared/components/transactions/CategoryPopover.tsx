import { useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ArrowLeft } from 'lucide-react'
import CategoryList from './CategoryList'

/** How far a picked category reaches: every row of the merchant, just this one, or rows that fit a rule you make */
export type PickScope = 'all' | 'one' | 'rule'

const SCOPE_OPTIONS: Array<{ value: PickScope; label: string; hint: string }> = [
  { value: 'all', label: 'All from this merchant', hint: 'Also future ones' },
  { value: 'one', label: 'Only this one', hint: 'Nothing else changes' },
  { value: 'rule', label: 'Make a rule…', hint: 'Choose what rows must match' },
]

/**
 * A category list that opens next to the button you give it (a Radix popover: it stays anchored, flips when there
 * is no room, closes on Escape or an outside click, and returns focus). Used by table rows and the bulk bar.
 */
export default function CategoryPopover({
  open,
  onOpenChange,
  trigger,
  side = 'bottom',
  categories,
  current,
  onPick,
  colorOf,
  scopes,
  detailsOf,
  onAddDetail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The button that opens it. It is not wrapped, so it keeps its own styling */
  trigger: ReactNode
  side?: 'top' | 'bottom'
  categories: string[]
  current?: string
  onPick: (category: string, scope: PickScope, detail?: string) => void
  colorOf?: (category: string) => string
  /** Asks how far a picked category reaches, as a second step: for a shop whose purchases need different categories */
  scopes?: PickScope[]
  /** Finer choices inside a category, asked as a second step so one pick sets both (a trip's Transport › Flight) */
  detailsOf?: (category: string) => string[]
  /** Lets a new detail be typed in the detail step; it is the caller's to remember */
  onAddDetail?: (category: string, name: string) => void
}) {
  // The category whose detail is being chosen
  const [detailFor, setDetailFor] = useState<string | null>(null)
  // The category chosen while the reach is still being asked, so choosing it does nothing until the reach is chosen
  const [pending, setPending] = useState<string | null>(null)
  // The detail chosen before the reach was asked, so both go out together
  const [pendingDetail, setPendingDetail] = useState<string | undefined>()
  const [newDetail, setNewDetail] = useState('')

  const chooseDetail = (category: string, detail: string) => {
    setDetailFor(null)
    if (scopes) {
      setPending(category)
      setPendingDetail(detail)

      return
    }
    onPick(category, 'all', detail)
    onOpenChange(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={o => {
        if (!o) {
          setPending(null)
          setPendingDetail(undefined)
          setDetailFor(null)
          setNewDetail('')
        }
        onOpenChange(o)
      }}
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-[80] w-[240px] overflow-hidden rounded-lg border border-line-strong bg-midnight-800 shadow-xl"
        >
          {detailFor && detailsOf ? (
            <div className="max-h-[280px] overflow-y-auto">
              <button
                onClick={() => setDetailFor(null)}
                className="flex w-full items-center gap-2 border-b border-line-strong px-3 py-3 text-left text-sm text-midnight-300 hover:bg-midnight-700"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{detailFor}</span>
                <span className="shrink-0 text-xs text-midnight-400">Subcategory</span>
              </button>
              {['', ...detailsOf(detailFor)].map(d => (
                <button
                  key={d}
                  onClick={() => chooseDetail(detailFor, d)}
                  className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-midnight-700 ${d ? 'text-ink' : 'text-midnight-400'}`}
                >
                  {d || 'No subcategory'}
                </button>
              ))}
              {onAddDetail && (
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    const name = newDetail.trim()

                    if (name) {
                      onAddDetail(detailFor, name)
                      setNewDetail('')
                      chooseDetail(detailFor, name)
                    }
                  }}
                  className="border-t border-line-strong p-3"
                >
                  <input
                    value={newDetail}
                    onChange={e => setNewDetail(e.target.value)}
                    maxLength={40}
                    placeholder="New subcategory, then Enter"
                    aria-label={`New subcategory of ${detailFor}`}
                    className="w-full rounded bg-midnight-700 px-3 py-2 text-sm focus:outline-none"
                  />
                </form>
              )}
            </div>
          ) : pending && scopes ? (
            <div>
              <button
                onClick={() => {
                  setPending(null)
                  setPendingDetail(undefined)
                }}
                className="flex w-full items-center gap-2 border-b border-line-strong px-3 py-2 text-left text-sm text-midnight-300 hover:bg-midnight-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Set to <span className="font-medium text-ink">{pending}</span> for…
              </button>
              {SCOPE_OPTIONS.filter(o => o.value === 'all' || scopes.includes(o.value)).map(o => (
                <button
                  key={o.value}
                  onClick={() => {
                    onPick(pending, o.value, pendingDetail)
                    setPending(null)
                    setPendingDetail(undefined)
                    onOpenChange(false)
                  }}
                  className="block w-full px-3 py-2 text-left hover:bg-midnight-700"
                >
                  <span className="block text-sm text-ink">{o.label}</span>
                  <span className="block text-xs text-midnight-400">{o.hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <CategoryList
              categories={categories}
              current={current}
              colorOf={colorOf}
              onDetails={detailsOf && onAddDetail ? setDetailFor : undefined}
              onPick={category => {
                if (detailsOf?.(category).length) {
                  setDetailFor(category)

                  return
                }
                if (scopes) {
                  setPending(category)

                  return
                }
                onPick(category, 'all')
                onOpenChange(false)
              }}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
