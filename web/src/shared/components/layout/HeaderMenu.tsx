import { useEffect, useRef, useState } from 'react'
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

// Less-used actions live here so the header stays readable
export default function HeaderMenu(props: HeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const item = 'w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-midnight-700 rounded-md'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-secondary px-2"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 bg-midnight-800 border border-midnight-600 rounded-xl shadow-2xl p-1 z-50"
        >
          <button role="menuitem" className={item} onClick={props.onToggleNumberFormat}>
            <Hash className="w-4 h-4 text-midnight-400" />
            <span className="flex-1">Number format</span>
            <span className="font-mono text-xs text-midnight-300">{props.numberFormatLabel}</span>
          </button>
          <button role="menuitem" className={item} onClick={props.onToggleRemember}>
            <HardDrive className="w-4 h-4 text-midnight-400" />
            <span className="flex-1">
              Keep data on this device
              <span className="block text-xs text-midnight-500">Stored unencrypted in this browser</span>
            </span>
            <span className={`text-xs font-medium ${props.remember ? 'text-income' : 'text-midnight-400'}`}>
              {props.remember ? 'On' : 'Off'}
            </span>
          </button>
          {props.hasData && (
            <>
              <button
                role="menuitem"
                className={item}
                onClick={() => {
                  props.onDownloadCsv()
                  setOpen(false)
                }}
              >
                <Download className="w-4 h-4 text-midnight-400" />
                Download CSV
              </button>
              <button
                role="menuitem"
                className={`${item} text-red-400`}
                onClick={() => {
                  props.onClear()
                  setOpen(false)
                }}
              >
                <Trash2 className="w-4 h-4" />
                Clear all data
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
