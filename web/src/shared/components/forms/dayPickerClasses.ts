// Day cells carry the range highlight; the button inside carries the filled start and end days
export const DAY_CLASSES = {
  root: 'relative text-midnight-100',
  months: 'relative',
  month_caption: 'flex h-8 items-center justify-center text-sm font-medium text-white',
  nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
  button_previous: 'p-1.5 rounded-lg hover:bg-midnight-700',
  button_next: 'p-1.5 rounded-lg hover:bg-midnight-700',
  chevron: 'fill-midnight-300',
  month_grid: 'mt-2 border-collapse',
  weekday: 'h-8 w-9 text-xs font-normal text-midnight-400',
  day: 'p-0 text-center',
  day_button: 'h-9 w-9 rounded-md text-sm hover:bg-midnight-700',
  range_start: 'rounded-l-md bg-accent/20 [&>button]:bg-accent [&>button]:text-white',
  range_end: 'rounded-r-md bg-accent/20 [&>button]:bg-accent [&>button]:text-white',
  range_middle: 'bg-accent/20',
  today: '[&>button]:text-accent',
  outside: 'opacity-40',
}
