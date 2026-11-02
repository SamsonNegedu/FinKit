import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker } from 'react-day-picker'
import { Calendar } from 'lucide-react'
import { formatDay, parseLocalDate, toISODate } from '@/shared/utils/dates'
import { DAY_CLASSES } from './dayPickerClasses'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  /** The latest day that can be picked */
  max?: string
  /** Show the year too, for dates that can be far back */
  withYear?: boolean
}

/** One day, picked from the same calendar as the range picker. */
export default function DatePicker({ value, onChange, placeholder = 'Pick a date', id, max, withYear = false }: Props) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseLocalDate(value) : undefined

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button id={id} type="button" className="input w-full flex items-center justify-between text-left">
          <span className={value ? '' : 'text-midnight-400'}>
            {value
              ? withYear
                ? `${formatDay(value)} ${parseLocalDate(value).getFullYear()}`
                : formatDay(value)
              : placeholder}
          </span>
          <Calendar className="w-4 h-4 text-midnight-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-[80] rounded-xl border border-midnight-600 bg-midnight-800 p-3 shadow-2xl"
        >
          <DayPicker
            mode="single"
            weekStartsOn={1}
            defaultMonth={selected}
            disabled={max ? { after: parseLocalDate(max) } : undefined}
            selected={selected}
            onSelect={day => {
              onChange(day ? toISODate(day) : '')
              setOpen(false)
            }}
            classNames={{ ...DAY_CLASSES, selected: '[&>button]:bg-accent [&>button]:text-white' }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
