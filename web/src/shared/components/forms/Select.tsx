import * as RadixSelect from '@radix-ui/react-select'
import type { ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  /** A dot shown before the label, e.g. a category's color */
  color?: string
  /** Shown before the label instead of the dot */
  icon?: ReactNode
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  id?: string
  ariaLabel?: string
  placeholder?: string
  className?: string
}

// Radix reserves the empty string to mean "nothing chosen", but some of our options legitimately have it ("All sources")
const EMPTY = '__empty__'
const encode = (v: string) => (v === '' ? EMPTY : v)
const decode = (v: string) => (v === EMPTY ? '' : v)

/** The app's dropdown: a Radix Select in the app's colors, used instead of the browser's own. */
export default function Select({ value, onChange, options, id, ariaLabel, placeholder, className = '' }: Props) {
  return (
    // An empty value with no "empty" option means nothing is chosen, which is what lets Radix show the placeholder
    <RadixSelect.Root
      value={value === '' && !options.some(o => o.value === '') ? '' : encode(value)}
      onValueChange={v => onChange(decode(v))}
    >
      <RadixSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        className={`input flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className="truncate">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon>
          <ChevronDown className="w-4 h-4 text-midnight-400" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-[90] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-midnight-600 bg-midnight-800 shadow-2xl"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map(o => (
              <RadixSelect.Item
                key={o.value}
                value={encode(o.value)}
                disabled={o.disabled}
                className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-midnight-100 outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-midnight-700"
              >
                <RadixSelect.ItemIndicator className="absolute left-2">
                  <Check className="w-4 h-4 text-accent" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>
                  <span className="inline-flex items-center gap-2">
                    {o.icon ??
                      (o.color ? (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
                      ) : null)}
                    {o.label}
                  </span>
                </RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
