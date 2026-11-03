import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { DayPicker, type DateRange } from 'react-day-picker'
import { Calendar } from 'lucide-react'
import { calendarJump } from './CalendarDropdown'
import { DAY_CLASSES } from './dayPickerClasses'
import { formatDay, parseLocalDate, toISODate } from '@/shared/utils/dates'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  placeholder?: string
}

/** Pick a start and an end in one calendar (react-day-picker in a Radix popover, styled like the rest of the app). */
export default function DateRangePicker({ start, end, onChange, placeholder = 'Pick dates' }: Props) {
  const [open, setOpen] = useState(false)
  const selected: DateRange | undefined = start
    ? { from: parseLocalDate(start), to: end ? parseLocalDate(end) : undefined }
    : undefined
  const label = start ? (end ? `${formatDay(start)} – ${formatDay(end)}` : `${formatDay(start)} – …`) : placeholder

  // Two clicks make a range: the first sets the start and keeps the calendar open, the second sets the end.
  // DayPicker's own range logic is not used for this, because it reports the first click as a finished range.
  const pick = (date: Date) => {
    const day = toISODate(date)

    if (!start || end) {
      onChange(day, '')

      return
    }
    onChange(day < start ? day : start, day < start ? start : day)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="input w-full flex items-center justify-between text-left">
          <span className={start ? '' : 'text-midnight-400'}>{label}</span>
          <Calendar className="w-4 h-4 text-midnight-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-[80] rounded-xl border border-line-strong bg-midnight-800 p-3 shadow-2xl"
        >
          <DayPicker
            mode="range"
            weekStartsOn={1}
            defaultMonth={selected?.from}
            selected={selected}
            onDayClick={pick}
            classNames={DAY_CLASSES}
            {...calendarJump()}
          />
          <div className="flex justify-between mt-1 text-sm">
            <button type="button" className="px-1 text-midnight-400 hover:text-ink" onClick={() => onChange('', '')}>
              Clear
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
