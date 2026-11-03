import type { ChangeEvent } from 'react'
import type { DropdownProps } from 'react-day-picker'
import Select from './Select'

/**
 * The month and year pickers in a calendar's header, drawn with the app's Select. react-day-picker would
 * otherwise render the browser's own <select>. It expects a change event, so the picked value is wrapped in one.
 */
export function CalendarDropdown({ options, value, onChange, 'aria-label': label }: DropdownProps) {
  return (
    <Select
      value={String(value ?? '')}
      ariaLabel={label}
      className="!w-auto !gap-1 !px-2 !py-1 text-sm"
      options={(options ?? []).map(o => ({ value: String(o.value), label: o.label, disabled: o.disabled }))}
      onChange={v => onChange?.({ target: { value: v } } as ChangeEvent<HTMLSelectElement>)}
    />
  )
}

/** Props that turn a calendar's title into a month and a year you can jump to, over a sensible span of years. */
export const calendarJump = () => ({
  captionLayout: 'dropdown' as const,
  startMonth: new Date(2015, 0),
  endMonth: new Date(new Date().getFullYear() + 2, 11),
  components: { Dropdown: CalendarDropdown },
})
