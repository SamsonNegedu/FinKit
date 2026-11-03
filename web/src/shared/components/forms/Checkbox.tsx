import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel?: string
  className?: string
}

/** The app's checkbox: a Radix Checkbox in the app's colors, used instead of the browser's own. */
export default function Checkbox({ checked, onChange, ariaLabel, className = '' }: Props) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={v => onChange(v === true)}
      aria-label={ariaLabel}
      className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-midnight-500 bg-midnight-700 outline-none focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:border-accent data-[state=checked]:bg-accent ${className}`}
    >
      <RadixCheckbox.Indicator>
        <Check className="h-3.5 w-3.5 text-midnight-950" strokeWidth={3} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
}
