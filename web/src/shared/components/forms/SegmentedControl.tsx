import type { ReactNode } from 'react'
import * as RadixRadio from '@radix-ui/react-radio-group'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface Props<T extends string> {
  /** An empty string means none is chosen (a custom period, say) */
  value: T | ''
  onChange: (value: T) => void
  options: Array<SegmentOption<T>>
  ariaLabel: string
  /** pills: separate rounded buttons. track: one trough with a raised choice */
  variant?: 'pills' | 'track'
  className?: string
}

const PILL =
  'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent'

/**
 * Choose one of a few views of the same thing, shown as buttons (Radix RadioGroup underneath, so arrow keys move
 * the choice). For switching between pages use `TabLinks`; for tabs with their own content use `Tabs`.
 */
export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  variant = 'pills',
  className = '',
}: Props<T>) {
  const track = variant === 'track'

  return (
    <RadixRadio.Root
      value={value}
      onValueChange={v => onChange(v as T)}
      aria-label={ariaLabel}
      orientation="horizontal"
      className={`${track ? 'inline-flex rounded-lg bg-midnight-800 p-1' : 'flex gap-1.5'} ${className}`}
    >
      {options.map(o => (
        <RadixRadio.Item
          key={o.value}
          value={o.value}
          className={
            track
              ? 'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm text-midnight-300 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:bg-midnight-600 data-[state=checked]:text-white'
              : `${PILL} bg-midnight-800 text-midnight-300 hover:bg-midnight-700 data-[state=checked]:bg-accent data-[state=checked]:text-white`
          }
        >
          {o.icon}
          {o.label}
        </RadixRadio.Item>
      ))}
    </RadixRadio.Root>
  )
}
