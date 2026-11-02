import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Download, Trash2, HardDrive, Hash } from 'lucide-react'

interface HeaderMenuProps {
  hasData: boolean
  numberFormatLabel: string
  onToggleNumberFormat: () => void
  remember: boolean
  onToggleRemember: () => void
  onDownloadCsv: () => void
  onClear: () => void
}

const ITEM =
  'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none data-[highlighted]:bg-midnight-700'

// Less-used actions live here so the header stays readable
export default function HeaderMenu(props: HeaderMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="btn-secondary px-2" aria-label="More options">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-[80] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-midnight-600 bg-midnight-800 p-1 shadow-2xl"
        >
          {/* The two settings change in place: keep the menu open so the new value can be seen */}
          <DropdownMenu.Item
            className={ITEM}
            onSelect={e => {
              e.preventDefault()
              props.onToggleNumberFormat()
            }}
          >
            <Hash className="w-4 h-4 text-midnight-400" />
            <span className="flex-1">Number format</span>
            <span className="font-mono text-xs text-midnight-300">{props.numberFormatLabel}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={ITEM}
            onSelect={e => {
              e.preventDefault()
              props.onToggleRemember()
            }}
          >
            <HardDrive className="w-4 h-4 text-midnight-400" />
            <span className="flex-1">
              Keep data on this device
              <span className="block text-xs text-midnight-500">Stored unencrypted in this browser</span>
            </span>
            <span className={`text-xs font-medium ${props.remember ? 'text-income' : 'text-midnight-400'}`}>
              {props.remember ? 'On' : 'Off'}
            </span>
          </DropdownMenu.Item>
          {props.hasData && (
            <>
              <DropdownMenu.Item className={ITEM} onSelect={props.onDownloadCsv}>
                <Download className="w-4 h-4 text-midnight-400" />
                Download CSV
              </DropdownMenu.Item>
              <DropdownMenu.Item className={`${ITEM} text-red-400`} onSelect={props.onClear}>
                <Trash2 className="w-4 h-4" />
                Clear all data
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
