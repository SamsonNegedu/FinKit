import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarClock, Check } from 'lucide-react'
import type { Transaction } from '@/shared/types'
import Tooltip from '@/shared/components/Tooltip'

const label = (month: string) => {
  const [y, m] = month.split('-').map(Number)

  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const shift = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Which month a payment counts toward in totals and budgets, for a monthly charge taken a few days early or late.
 * The bank's date stays what the table shows. Choosing here is kept, and the app stops guessing for this payment.
 */
export default function CountsToMonth({
  tx,
  onChange,
}: {
  tx: Transaction
  onChange: (updates: Partial<Transaction>) => void
}) {
  const [open, setOpen] = useState(false)
  const own = tx.date.slice(0, 7)
  const current = tx.countsToMonth ?? own
  const options = [shift(own, -1), own, shift(own, 1)]
  const moved = current !== own

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip label={moved ? `Counts toward ${label(current)}. Click to change` : 'Count it in another month'}>
        <Popover.Trigger asChild>
          <button
            aria-label={`Month this counts toward: ${label(current)}`}
            className={
              moved
                ? 'flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent hover:bg-accent/25'
                : 'rounded p-0.5 text-midnight-500 opacity-0 hover:bg-midnight-700 hover:text-white focus:opacity-100 group-hover:opacity-100 max-md:hidden'
            }
          >
            <CalendarClock className="h-3 w-3" />
            {moved && <span>{new Date(`${current}-01T00:00`).toLocaleDateString('en-US', { month: 'short' })}</span>}
          </button>
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="z-[80] w-[220px] overflow-hidden rounded-lg border border-midnight-600 bg-midnight-800 shadow-xl"
        >
          <p className="border-b border-midnight-600 px-3 py-3 text-xs text-midnight-400">Count this payment in</p>
          {options.map(month => (
            <button
              key={month}
              onClick={() => {
                onChange({
                  countsToMonth: month === own ? undefined : month,
                  countsToMonthSource: 'manual',
                })
                setOpen(false)
              }}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-white hover:bg-midnight-700"
            >
              <span>
                {label(month)}
                {month === own && <span className="ml-2 text-xs text-midnight-400">bank date</span>}
              </span>
              {month === current && <Check className="h-4 w-4 text-accent" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
