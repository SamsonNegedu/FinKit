import * as Popover from '@radix-ui/react-popover'
import { SlidersHorizontal } from 'lucide-react'
import Checkbox from '@/shared/components/forms/Checkbox'
import Select, { type SelectOption } from '@/shared/components/forms/Select'

/** The filters that are used less often, kept in one panel so the toolbar stays one row and never shifts. */
export default function MoreFilters({
  sources,
  source,
  onSourceChange,
  accounts,
  account,
  onAccountChange,
  transfers,
  onTransfersChange,
  onClear,
}: {
  /** Empty when there is nothing to choose between: the control is then left out */
  sources: SelectOption[]
  source: string
  onSourceChange: (value: string) => void
  accounts: SelectOption[]
  account: string
  onAccountChange: (value: string) => void
  transfers: boolean
  onTransfersChange: (value: boolean) => void
  onClear: () => void
}) {
  const active = (source ? 1 : 0) + (account ? 1 : 0) + (transfers ? 1 : 0)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="input flex items-center gap-2 text-sm" aria-label="More filters">
          <SlidersHorizontal className="h-4 w-4 text-midnight-400" aria-hidden="true" />
          Filters
          {active > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{active}</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-[80] w-72 space-y-4 rounded-xl border border-midnight-600 bg-midnight-800 p-4 shadow-2xl"
        >
          {sources.length > 0 && (
            <div className="space-y-1">
              <label htmlFor="filter-source" className="text-xs font-medium text-midnight-400">
                Source
              </label>
              <Select
                id="filter-source"
                className="w-full text-sm"
                value={source}
                onChange={onSourceChange}
                options={[{ value: '', label: 'All sources' }, ...sources]}
              />
            </div>
          )}
          {accounts.length > 0 && (
            <div className="space-y-1">
              <label htmlFor="filter-account" className="text-xs font-medium text-midnight-400">
                Account
              </label>
              <Select
                id="filter-account"
                className="w-full text-sm"
                value={account}
                onChange={onAccountChange}
                options={[{ value: '', label: 'All accounts' }, ...accounts]}
              />
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-midnight-200">
            <Checkbox checked={transfers} onChange={onTransfersChange} />
            Include transfers between your own accounts
          </label>
          {active > 0 && (
            <button
              className="text-xs text-midnight-400 underline underline-offset-2 hover:text-white"
              onClick={onClear}
            >
              Clear these filters
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
