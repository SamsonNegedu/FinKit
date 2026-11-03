import { lazy, Suspense, useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { COLOR_CHOICES } from '@/shared/components/categoryIconSet'
import Tooltip from '@/shared/components/Tooltip'
import type { CategoryStyle } from '@/shared/utils/categorizer'

const IconPicker = lazy(() => import('./IconPicker'))

function HexField({ color, onPick }: { color: string; onPick: (hex: string) => void }) {
  const [text, setText] = useState('')
  const valid = /^#[0-9a-fA-F]{6}$/.test(text)

  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className="h-6 w-6 shrink-0 rounded-full"
        style={{ backgroundColor: valid ? text : color }}
        aria-hidden="true"
      />
      <input
        className="input w-28 !py-1 text-sm"
        placeholder="#a855f7"
        aria-label="Hex color"
        maxLength={7}
        value={text}
        onChange={e => {
          const next = e.target.value.startsWith('#') || !e.target.value ? e.target.value : `#${e.target.value}`

          setText(next)
          if (/^#[0-9a-fA-F]{6}$/.test(next)) {
            onPick(next.toLowerCase())
          }
        }}
      />
      {text && !valid && <span className="text-xs text-midnight-400">6 digits, like #a855f7</span>}
    </div>
  )
}

/** The icon and color of a category, changed from its badge. Resetting goes back to what it had by default. */
export default function CategoryStylePicker({
  label,
  style,
  color,
  badge,
  disabled = false,
  onChange,
}: {
  label: string
  style: CategoryStyle | undefined
  color: string
  badge: ReactNode
  disabled?: boolean
  onChange: (change: CategoryStyle | null) => void
}) {
  return (
    <Popover.Root>
      <Tooltip label="Change icon and color">
        <Popover.Trigger asChild>
          <button
            disabled={disabled}
            aria-label={label}
            className="rounded-lg p-0.5 hover:bg-midnight-700 disabled:opacity-50"
          >
            {badge}
          </button>
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-[80] w-80 space-y-3 rounded-xl border border-line-strong bg-midnight-800 p-3 shadow-2xl"
        >
          <div>
            <p className="mb-1.5 text-xs text-midnight-400">Icon</p>
            <Suspense fallback={<p className="py-6 text-center text-xs text-midnight-400">Loading icons…</p>}>
              <IconPicker value={style?.icon} color={color} onPick={icon => onChange({ icon })} />
            </Suspense>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-midnight-400">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_CHOICES.map(c => (
                <button
                  key={c}
                  aria-label={c}
                  aria-pressed={style?.color === c}
                  onClick={() => onChange({ color: c })}
                  className={`h-6 w-6 rounded-full ${style?.color === c ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <HexField color={color} onPick={c => onChange({ color: c })} />
          </div>
          {style && (
            <button className="text-xs text-midnight-400 underline hover:text-ink" onClick={() => onChange(null)}>
              Back to the default
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
