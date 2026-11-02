import * as RadixRadio from '@radix-ui/react-radio-group'

export interface RadioOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<RadioOption<T>>
  ariaLabel: string
}

/** The app's radio buttons: Radix RadioGroup in the app's colors. */
export default function RadioGroup<T extends string>({ value, onChange, options, ariaLabel }: Props<T>) {
  return (
    <RadixRadio.Root
      value={value}
      onValueChange={v => onChange(v as T)}
      aria-label={ariaLabel}
      className="flex flex-wrap gap-x-5 gap-y-2"
    >
      {options.map(o => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-midnight-200">
          <RadixRadio.Item
            value={o.value}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-midnight-500 bg-midnight-700 outline-none focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:border-accent"
          >
            <RadixRadio.Indicator className="h-2.5 w-2.5 rounded-full bg-accent" />
          </RadixRadio.Item>
          {o.label}
        </label>
      ))}
    </RadixRadio.Root>
  )
}
