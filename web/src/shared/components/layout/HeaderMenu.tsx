import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Download, Trash2, HardDrive, Hash, FilePlus, Shield, ShieldOff } from 'lucide-react'

interface HeaderMenuProps {
  hasData: boolean
  anonymized: boolean
  onToggleAnonymization: () => void
  onAddFile: () => void
  numberFormatLabel: string
  onToggleNumberFormat: () => void
  remember: boolean
  onToggleRemember: () => void
  onDownloadCsv: () => void
  onClear: () => void
}

const ITEM =
  'flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none data-[highlighted]:bg-midnight-700'

const SEPARATOR = 'my-1 h-px bg-line'

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
          className="z-[80] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line-strong bg-midnight-800 p-1 shadow-2xl"
        >
          {props.hasData && (
            <>
              <DropdownMenu.Item className={ITEM} onSelect={props.onAddFile}>
                <FilePlus className="w-4 h-4 text-midnight-400" />
                Add a file…
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={ITEM}
                onSelect={e => {
                  e.preventDefault()
                  props.onToggleAnonymization()
                }}
              >
                {props.anonymized ? (
                  <Shield className="w-4 h-4 text-accent" />
                ) : (
                  <ShieldOff className="w-4 h-4 text-warning" />
                )}
                <span className="flex-1">Anonymize amounts</span>
                <span className={`text-xs font-medium ${props.anonymized ? 'text-accent' : 'text-midnight-400'}`}>
                  {props.anonymized ? 'On' : 'Off'}
                </span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={SEPARATOR} />
            </>
          )}
          {/* The settings change in place: keep the menu open so the new value can be seen */}
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
              <DropdownMenu.Separator className={SEPARATOR} />
              <DropdownMenu.Item className={ITEM} onSelect={props.onDownloadCsv}>
                <Download className="w-4 h-4 text-midnight-400" />
                Download CSV
              </DropdownMenu.Item>
              <DropdownMenu.Item className={`${ITEM} text-negative`} onSelect={props.onClear}>
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
