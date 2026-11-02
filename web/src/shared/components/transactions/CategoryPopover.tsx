import type { ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import CategoryList from './CategoryList'

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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The button that opens it. It is not wrapped, so it keeps its own styling */
  trigger: ReactNode
  side?: 'top' | 'bottom'
  categories: string[]
  current?: string
  onPick: (category: string) => void
  colorOf?: (category: string) => string
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-[80] w-[220px] max-h-[280px] overflow-hidden rounded-lg border border-midnight-600 bg-midnight-800 shadow-xl"
        >
          <CategoryList
            categories={categories}
            current={current}
            colorOf={colorOf}
            onPick={category => {
              onPick(category)
              onOpenChange(false)
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
