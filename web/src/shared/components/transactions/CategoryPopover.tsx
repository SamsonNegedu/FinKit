import { useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ArrowLeft } from 'lucide-react'
import CategoryList from './CategoryList'

/** How far a picked category reaches: every row of the merchant, just this one, or rows that fit a rule you make */
export type PickScope = 'all' | 'one' | 'rule'

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
  currentDetail,
  onPick,
  colorOf,
  scopes,
  merchantName,
  detailsOf,
  canAddDetail,
  onAddDetail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The button that opens it. It is not wrapped, so it keeps its own styling */
  trigger: ReactNode
  side?: 'top' | 'bottom'
  categories: string[]
  current?: string
  /** The subcategory in use on this row, marked when its category is current */
  currentDetail?: string
  onPick: (category: string, scope: PickScope, detail?: string) => void
  colorOf?: (category: string) => string
  /** Asks how far a picked category reaches, as a second step: for a shop whose purchases need different categories */
  scopes?: PickScope[]
  /** Used in the reach step, so "All from …" names the merchant */
  merchantName?: string
  /** Finer choices inside a category, shown under it as chips (a trip's Transport › Flight) */
  detailsOf?: (category: string) => string[]
  /** Categories that can take a subcategory; all of them when not given */
  canAddDetail?: (category: string) => boolean
  /** Lets a new detail be typed in; it is the caller's to remember */
  onAddDetail?: (category: string, name: string) => void
}) {
  // The category whose new detail is being typed
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

  const scopeOptions: Array<{ value: PickScope; label: string; hint: string }> = [
    {
      value: 'all',
      label: `All from ${merchantName || 'this merchant'}`,
      hint: 'Also future rows · saves a merchant rule',
    },
    { value: 'one', label: 'Only this transaction', hint: 'Nothing else changes or is remembered' },
    { value: 'rule', label: 'Only rows that match…', hint: 'Choose payee, words or amount' },
  ]

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
          className="z-[80] w-[280px] overflow-hidden rounded-lg border border-line-strong bg-midnight-800 shadow-xl"
        >
          {detailFor && detailsOf ? (
            <div className="max-h-[300px] overflow-y-auto">
              <button
                onClick={() => setDetailFor(null)}
                className="flex w-full items-center gap-2 border-b border-line-strong px-3 py-3 text-left text-sm text-midnight-300 hover:bg-midnight-700"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">New subcategory in {detailFor}</span>
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
                  <label htmlFor="new-category-detail" className="mb-1.5 block text-xs text-midnight-400">
                    New subcategory under {detailFor}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-category-detail"
                      value={newDetail}
                      onChange={e => setNewDetail(e.target.value)}
                      maxLength={40}
                      autoFocus
                      placeholder="e.g. Fashion"
                      className="input min-w-0 flex-1 !px-2 !py-1 text-sm"
                    />
                    <button type="submit" className="btn-primary text-sm" disabled={!newDetail.trim()}>
                      Add
                    </button>
                  </div>
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
                className="flex w-full items-center gap-2 border-b border-line-strong px-3 py-2.5 text-left hover:bg-midnight-700"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-midnight-300" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    Set to {pending}
                    {pendingDetail ? ` › ${pendingDetail}` : ''}
                  </span>
                  <span className="block text-xs text-midnight-400">Choose what changes</span>
                </span>
              </button>
              {scopeOptions
                .filter(o => o.value === 'all' || scopes.includes(o.value))
                .map(o => (
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
              currentDetail={currentDetail}
              colorOf={colorOf}
              detailsOf={detailsOf}
              canAddDetail={canAddDetail}
              onAddDetail={onAddDetail ? category => setDetailFor(category) : undefined}
              onPick={(category, detail) => {
                if (detail !== undefined) {
                  chooseDetail(category, detail)

                  return
                }
                if (scopes) {
                  setPending(category)
                  setPendingDetail(undefined)

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
